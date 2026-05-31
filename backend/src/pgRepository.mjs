import { randomUUID } from 'node:crypto'
import { query, withTransaction } from './db.mjs'
import { ids } from './step1Data.mjs'
import { objectiveFactorDefinitions, subjectiveFactorDefinitions } from './step2Data.mjs'

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function getCurrentUser(userId = ids.currentNurse) {
  const result = await query(
    `
    select u.id, u.name, u.role, n.display_name, n.short_name
    from users u
    left join nurses n on n.id = u.id
    where u.id = $1
    `,
    [userId],
  )
  const user = result.rows[0]
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', '找不到使用者', { userId })
  const shift = await currentShiftRow()
  return {
    id: user.id,
    name: user.name,
    displayName: user.display_name ?? user.name,
    shortName: user.short_name ?? user.name,
    role: user.role,
    currentShiftId: shift.id,
  }
}

export async function getCurrentShift(unitName = 'ICU') {
  const shift = await currentShiftRow(unitName)
  return formatShift(shift)
}

export async function listShifts({ unitName = 'ICU' } = {}) {
  const result = await query(
    `
    select s.*, n.short_name as charge_short_name
    from shifts s
    left join nurses n on n.id = s.charge_nurse_id
    where s.unit_name = $1
    order by s.starts_at desc
    `,
    [unitName],
  )
  return result.rows.map(formatShift)
}

async function resolveOnDutyCharge(shift) {
  if (shift.charge_nurse_id && shift.charge_short_name) {
    return { id: shift.charge_nurse_id, shortName: shift.charge_short_name }
  }
  const fallback = await query(
    `
    select n.id, n.short_name
    from shift_nurses sn
    join nurses n on n.id = sn.nurse_id
    where sn.shift_id = $1 and sn.role = 'charge_nurse'
    limit 1
    `,
    [shift.id],
  )
  if (fallback.rows[0]) {
    return { id: fallback.rows[0].id, shortName: fallback.rows[0].short_name }
  }
  return { id: shift.charge_nurse_id ?? null, shortName: shift.charge_short_name ?? '—' }
}

export async function listNurses({ shiftId } = {}) {
  const params = []
  let join = ''
  let where = 'where n.is_active = true'
  if (shiftId) {
    params.push(shiftId)
    join = 'join shift_nurses sn on sn.nurse_id = n.id'
    where += ' and sn.shift_id = $1'
  }
  const result = await query(
    `
    select n.id, n.display_name, n.short_name, n.seniority_level, n.is_active,
      coalesce(sn.role, u.role) as role
    from nurses n
    join users u on u.id = n.id
    ${join}
    ${where}
    order by n.display_name
    `,
    params,
  )
  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    shortName: row.short_name,
    seniorityLevel: row.seniority_level,
    role: row.role,
    isActive: row.is_active,
  }))
}

export async function listAdmissions({ shiftId, status = 'active' } = {}) {
  if (shiftId) await ensureShift(shiftId)
  if (!['active', 'transferred', 'discharged'].includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status })
  }
  const result = await query(
    `
    select a.id as admission_id, p.id as patient_id, b.id as bed_id, b.label as bed_label,
      p.name as patient_name, a.diagnosis, p.sex,
      extract(year from age(a.admitted_at, p.birth_date))::int as age,
      a.admitted_at::text, a.attending_physician
    from admissions a
    join patients p on p.id = a.patient_id
    join beds b on b.id = a.bed_id
    where a.status = $1
    order by b.bed_no
    `,
    [status],
  )
  return result.rows.map(formatAdmission)
}

export async function getNurseOverview({ shiftId, userId = ids.currentNurse } = {}) {
  const shift = shiftId ? await ensureShift(shiftId) : await currentShiftRow()
  const user = await getCurrentUser(userId)
  const allPatients = await listAdmissions({ shiftId: shift.id, status: 'active' })
  const assigned = await query(
    `
    select ai.admission_id
    from allocation_items ai
    join allocation_runs ar on ar.id = ai.allocation_run_id
    where ar.shift_id = $1 and ai.nurse_id = $2
    order by ai.sort_order
    `,
    [shift.id, user.id],
  )
  const assignedIds = new Set(assigned.rows.map((row) => row.admission_id))
  return {
    shift: { id: shift.id, label: shiftLabel(shift) },
    onDutyCharge: await resolveOnDutyCharge(shift),
    myPatients: allPatients.filter((admission) => assignedIds.has(admission.admissionId)),
    allPatients,
  }
}

export async function listBurdenAssessments({ shiftId, scope = 'all', userId = ids.currentNurse } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  await ensureBurdenAssessmentsForShift(shiftId)
  const params = [shiftId]
  let ownerWhere = ''
  if (scope === 'mine') {
    params.push(userId)
    ownerWhere = `
      and ba.admission_id in (
        select ai.admission_id
        from allocation_items ai
        join allocation_runs ar on ar.id = ai.allocation_run_id
        where ar.shift_id = $1 and ai.nurse_id = $2
      )
    `
  }
  const result = await query(
    `
    select ba.*, b.label as bed_label, b.bed_no, a.diagnosis
    from burden_assessments ba
    join admissions a on a.id = ba.admission_id
    join beds b on b.id = a.bed_id
    where ba.shift_id = $1 ${ownerWhere}
    order by b.bed_no
    `,
    params,
  )
  return Promise.all(result.rows.map(formatAssessment))
}

export async function updateBurdenAssessment({ assessmentId, patch, userId = ids.currentNurse } = {}) {
  const current = await query('select * from burden_assessments where id = $1', [assessmentId])
  const assessment = current.rows[0]
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', '找不到麻煩度評估', { assessmentId })
  const user = await getCurrentUser(userId)
  const owner = await admissionOwner(assessment.shift_id, assessment.admission_id)
  const canEdit =
    !owner ||
    owner.nurseId === userId ||
    ['charge_nurse', 'admin'].includes(user.role)
  if (!canEdit) {
    throw new ApiError(403, 'FORBIDDEN', '只能更新自己負責的病患評估', { assessmentId })
  }
  const subjective = normalizeSubjective(patch.subjective ?? {})
  const status = patch.status ?? assessment.status
  if (!['draft', 'submitted'].includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status })
  }

  await withTransaction(async (client) => {
    const factorRows = await client.query('select id, code, value_type from burden_factors where category = $1', ['subjective'])
    for (const factor of factorRows.rows) {
      await upsertSubjectiveValue(client, assessmentId, factor.id, factor.code, factor.value_type, subjective[factor.code])
    }
    const subjectiveTotal = subjectiveScore(subjective)
    await client.query(
      `
      update burden_assessments
      set submitted_by = $2::uuid,
        status = $3::varchar,
        subjective_total = $4::numeric,
        total_score = objective_total + $4::numeric,
        submitted_at = case when $3::varchar = 'submitted' then now() else null end,
        updated_at = now()
      where id = $1
      `,
      [assessmentId, userId, status, subjectiveTotal],
    )
  })
  return (await listBurdenAssessments({ shiftId: assessment.shift_id, scope: 'all' })).find((item) => item.assessmentId === assessmentId)
}

export async function listTasks({ shiftId, assignee = 'me', status, kind, urgent, userId = ids.currentNurse } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  const params = [shiftId]
  const where = ['t.shift_id = $1']
  if (assignee === 'me') {
    params.push(userId)
    where.push(`t.assigned_nurse_id = $${params.length}`)
  }
  if (status) {
    params.push(status)
    where.push(`t.status = $${params.length}`)
  }
  if (kind) {
    params.push(kind)
    where.push(`t.kind = $${params.length}`)
  }
  if (urgent === true || urgent === 'true') {
    where.push('t.urgent = true')
  }
  const rows = await query(taskSelectSql(where), params)
  const all = await query(taskSelectSql(['t.shift_id = $1', assignee === 'me' ? 't.assigned_nurse_id = $2' : 'true']), assignee === 'me' ? [shiftId, userId] : [shiftId])
  return {
    data: rows.rows.map(formatTask),
    meta: {
      counts: {
        total: all.rows.length,
        pending: all.rows.filter((task) => task.status === 'pending').length,
        done: all.rows.filter((task) => task.status === 'done').length,
      },
      remainingPoints: all.rows.filter((task) => task.status === 'pending').reduce((sum, task) => sum + taskPoints(task), 0),
    },
  }
}

export async function updateTask({ taskId, patch, userId = ids.currentNurse } = {}) {
  if (!['pending', 'done', 'cancelled'].includes(patch.status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status: patch.status })
  }
  const result = await query(
    `
    update tasks
    set status = $2::varchar,
      completed_at = case when $2::varchar = 'done' then now() else null end,
      completed_by = case when $2::varchar = 'done' then $3::uuid else null end
    where id = $1 and assigned_nurse_id = $3
    returning *
    `,
    [taskId, patch.status, userId],
  )
  if (!result.rows[0]) throw new ApiError(404, 'TASK_NOT_FOUND', '找不到任務', { taskId })
  const full = await query(taskSelectSql(['t.id = $1']), [taskId])
  return formatTask(full.rows[0])
}


const SENIORITY_RANK = {
  '1年以下': 0,
  '1-4年':   1,
  '4-10年':  2,
  '10-15年': 3,
  '15年以上':4,
  charge_nurse: 5,
}

export async function suggestAllocationRun({ shiftId, targetShiftId, userId = ids.chargeNurse } = {}) {
  const user = await getCurrentUser(userId)
  if (!['charge_nurse', 'admin'].includes(user.role)) throw new ApiError(403, 'FORBIDDEN', '只有小組長或管理者可以產生分床建議')

  const admissions = await admissionsWithScores(shiftId)
  const nurses = (await listNurses({ shiftId })).filter((n) => ['nurse', 'charge_nurse'].includes(n.role) && n.isActive)

  const avgScore = admissions.length ? admissions.reduce((s, a) => s + a.score, 0) / admissions.length : 0
  const TOLERANCE = 5

  const runId = randomUUID()
  await withTransaction(async (client) => {
    await client.query(
      `insert into allocation_runs (id, shift_id, target_shift_id, created_by, status, algorithm_version) values ($1,$2,$3,$4,'draft','seniority-aware-v1')`,
      [runId, shiftId, targetShiftId ?? shiftId, user.id],
    )

    const loads = new Map(nurses.map((n) => [n.id, 0]))
    const sortOrders = new Map(nurses.map((n) => [n.id, 0]))
    const assignedBeds = new Map(nurses.map((n) => [n.id, []]))
    const MAX_BED_GAP = 2

    for (const admission of admissions.sort((a, b) => b.score - a.score)) {
      const seniorityKey = (n) => (n.role === 'charge_nurse' ? 'charge_nurse' : (n.seniorityLevel ?? '4-10年'))
      const patientBedNo = bedNo(admission.bedLabel)

      const minLoad = Math.min(...nurses.map((n) => loads.get(n.id) ?? 0))
      const nearMin = nurses.filter((n) => (loads.get(n.id) ?? 0) <= minLoad + TOLERANCE)

      const isHighBurden = admission.score >= avgScore
      const hasNearbyBed = (n) => {
        const beds = assignedBeds.get(n.id)
        return beds.length === 0 || beds.some((b) => Math.abs(b - patientBedNo) <= MAX_BED_GAP)
      }
      const selected = [...nearMin].sort((a, b) => {
        const ra = SENIORITY_RANK[seniorityKey(a)] ?? 2
        const rb = SENIORITY_RANK[seniorityKey(b)] ?? 2
        const bySeniority = isHighBurden ? ra - rb : rb - ra
        if (bySeniority !== 0) return bySeniority
        return (hasNearbyBed(a) ? 0 : 1) - (hasNearbyBed(b) ? 0 : 1)
      })[0]

      if (!selected) continue
      assignedBeds.get(selected.id).push(patientBedNo)
      const sortOrder = (sortOrders.get(selected.id) ?? 0) + 1
      await client.query(
        `insert into allocation_items (allocation_run_id, admission_id, nurse_id, score, sort_order) values ($1,$2,$3,$4,$5)`,
        [runId, admission.admissionId, selected.id, admission.score, sortOrder],
      )
      loads.set(selected.id, (loads.get(selected.id) ?? 0) + admission.score)
      sortOrders.set(selected.id, sortOrder)
    }
  })
  return getAllocationRun({ allocationRunId: runId })
}

export async function getLatestAllocationRun({ shiftId } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  const result = await query(
    `select id from allocation_runs where shift_id = $1 order by (status = 'draft') desc, suggested_at desc limit 1`,
    [shiftId],
  )
  if (!result.rows[0]) return null
  return getAllocationRun({ allocationRunId: result.rows[0].id })
}

export async function getAllocationRun({ allocationRunId } = {}) {
  const run = await allocationRunRow(allocationRunId)
  const nurses = (await listNurses({ shiftId: run.shift_id })).filter((nurse) => ['nurse', 'charge_nurse'].includes(nurse.role))
  const admissions = await listAdmissions({ shiftId: run.shift_id, status: 'active' })
  const admissionMap = new Map(admissions.map((admission) => [admission.admissionId, admission]))
  const items = await query('select * from allocation_items where allocation_run_id = $1 order by nurse_id, sort_order', [run.id])
  const assigned = new Set(items.rows.map((item) => item.admission_id))
  const byNurse = nurses.map((nurse) => {
    const patients = items.rows
      .filter((item) => item.nurse_id === nurse.id)
      .map((item) => allocationPatient(admissionMap.get(item.admission_id), Number(item.score), item.is_manual_override))
      .filter(Boolean)
    return { nurseId: nurse.id, shortName: nurse.shortName, load: patients.reduce((sum, p) => sum + p.score, 0), patients }
  })
  const unassigned = admissions.filter((admission) => !assigned.has(admission.admissionId)).map((admission) => allocationPatient(admission, 0, false))
  const loads = byNurse.map((row) => row.load)
  return {
    allocationRunId: run.id,
    shiftId: run.shift_id,
    targetShiftId: run.target_shift_id,
    status: run.status,
    algorithmVersion: run.algorithm_version,
    suggestedAt: run.suggested_at,
    confirmedAt: run.confirmed_at,
    unassigned,
    byNurse,
    stats: {
      totalBeds: admissions.length,
      totalNurses: nurses.length,
      averageLoad: loads.length ? Math.round((loads.reduce((a, b) => a + b, 0) / loads.length) * 10) / 10 : 0,
      maxLoad: loads.length ? Math.max(...loads) : 0,
    },
  }
}

export async function updateAllocationItems({ allocationRunId, items } = {}) {
  const run = await allocationRunRow(allocationRunId)
  if (run.status !== 'draft') throw new ApiError(409, 'ALLOCATION_RUN_LOCKED', '已確認或取消的分床不可修改')
  const seen = new Set()
  await withTransaction(async (client) => {
    await client.query('delete from allocation_items where allocation_run_id = $1', [allocationRunId])
    for (const [index, item] of items.entries()) {
      if (seen.has(item.admissionId)) throw new ApiError(400, 'VALIDATION_ERROR', '同一位病患不可重複分配', { admissionId: item.admissionId })
      seen.add(item.admissionId)
      const score = await scoreForAdmission(item.admissionId)
      await client.query(
        `insert into allocation_items (allocation_run_id, admission_id, nurse_id, score, sort_order, is_manual_override) values ($1,$2,$3,$4,$5,$6)`,
        [allocationRunId, item.admissionId, item.nurseId, score, item.sortOrder ?? index + 1, Boolean(item.isManualOverride)],
      )
    }
  })
  return getAllocationRun({ allocationRunId })
}

export async function confirmAllocationRun({ allocationRunId } = {}) {
  const run = await getAllocationRun({ allocationRunId })
  if (run.unassigned.length > 0) throw new ApiError(409, 'ALLOCATION_INCOMPLETE', '仍有病患尚未分配', { unassigned: run.unassigned.map((item) => item.admissionId) })
  await query(`update allocation_runs set status = 'confirmed', confirmed_at = now() where id = $1`, [allocationRunId])
  return getAllocationRun({ allocationRunId })
}

export async function getWarRoom({ shiftId } = {}) {
  const allocation = await latestAllocation(shiftId)
  const tasksResult = await listTasks({ shiftId, assignee: 'all' })
  const tasksByNurse = new Map()
  for (const task of tasksResult.data) {
    const admission = await admissionOwner(shiftId, task.admissionId)
    if (!admission) continue
    const list = tasksByNurse.get(admission.nurseId) ?? []
    list.push(task)
    tasksByNurse.set(admission.nurseId, list)
  }
  const nurses = allocation.byNurse.map((row) => {
    const nurseTasks = tasksByNurse.get(row.nurseId) ?? []
    const remaining = nurseTasks.filter((task) => !task.done).reduce((sum, task) => sum + task.points, 0)
    return { ...row, remaining, tasks: nurseTasks }
  })
  return {
    overview: {
      nurseCount: nurses.length,
      totalTasks: tasksResult.meta.counts.total,
      doneTasks: tasksResult.meta.counts.done,
      pendingTasks: tasksResult.meta.counts.pending,
      urgentOpenTasks: tasksResult.data.filter((task) => task.urgent && !task.done).length,
    },
    nurses,
  }
}

export async function getHandoffSheet({ shiftId } = {}) {
  const allocation = await latestAllocation(shiftId)
  const rows = []
  for (const nurseRow of allocation.byNurse) {
    for (const patient of nurseRow.patients) {
      const admission = (await listAdmissions({ shiftId, status: 'active' })).find((item) => item.admissionId === patient.admissionId)
      if (!admission) continue
      rows.push({ ...admission, currentNurse: nurseRow.shortName, nextNurse: nurseRow.shortName, burdenScore: patient.score, handoffDiagnosis: admission.diagnosis })
    }
  }
  return { rows: rows.sort((a, b) => bedNo(a.bedLabel) - bedNo(b.bedLabel)) }
}

export async function listHandoffSnapshots() {
  const result = await query(
    `
    select ar.id, ar.shift_id, ar.confirmed_at, ar.created_by, s.shift_key, s.starts_at, s.ends_at,
      n.short_name as created_by_name
    from allocation_runs ar
    join shifts s on s.id = ar.shift_id
    left join nurses n on n.id = ar.created_by
    where ar.status = 'confirmed' and ar.confirmed_at is not null
    order by ar.confirmed_at desc
    `,
  )
  return Promise.all(result.rows.map((row) => buildHandoffSnapshotSummary(row)))
}

export async function getHandoffSnapshot({ allocationRunId } = {}) {
  const row = await query(
    `
    select ar.id, ar.shift_id, ar.confirmed_at, ar.created_by, s.shift_key, s.starts_at, s.ends_at,
      n.short_name as created_by_name
    from allocation_runs ar
    join shifts s on s.id = ar.shift_id
    left join nurses n on n.id = ar.created_by
    where ar.id = $1 and ar.status = 'confirmed'
    `,
    [allocationRunId],
  )
  if (!row.rows[0]) throw new ApiError(404, 'SNAPSHOT_NOT_FOUND', '找不到交班快照', { allocationRunId })
  const summary = await buildHandoffSnapshotSummary(row.rows[0])
  const allocation = await getAllocationRun({ allocationRunId })
  const tasksResult = await listTasks({ shiftId: row.rows[0].shift_id, assignee: 'all' })
  const nurseBlocks = allocation.byNurse.map((nurseRow) => ({
    nurseId: nurseRow.nurseId,
    nurseName: nurseRow.shortName,
    load: nurseRow.load,
    beds: nurseRow.patients.map((patient) => ({
      admissionId: patient.admissionId,
      bedLabel: patient.bedLabel,
      label: `${patient.bedLabel} — ${patient.diagnosis}`,
      score: patient.score,
      tone: patient.tone,
    })),
  }))
  return {
    ...summary,
    allocation: {
      unassignedCount: allocation.unassigned.length,
      stats: allocation.stats,
    },
    nurseBlocks,
    tasks: tasksResult.data,
  }
}

async function currentShiftRow(unitName = 'ICU') {
  const result = await query(
    `
    select s.*, n.short_name as charge_short_name
    from shifts s
    left join nurses n on n.id = s.charge_nurse_id
    where s.unit_name = $1 and s.status <> 'closed'
    order by s.starts_at desc
    limit 1
    `,
    [unitName],
  )
  if (!result.rows[0]) throw new ApiError(404, 'SHIFT_NOT_FOUND', '找不到目前班別', { unitName })
  return result.rows[0]
}

async function ensureShift(shiftId) {
  const result = await query(
    `select s.*, n.short_name as charge_short_name from shifts s left join nurses n on n.id = s.charge_nurse_id where s.id = $1`,
    [shiftId],
  )
  if (!result.rows[0]) throw new ApiError(404, 'SHIFT_NOT_FOUND', '找不到指定班別', { shiftId })
  return result.rows[0]
}

function formatShift(row) {
  return { id: row.id, shiftKey: row.shift_key, label: shiftLabel(row), startsAt: row.starts_at, endsAt: row.ends_at, chargeNurse: { id: row.charge_nurse_id, shortName: row.charge_short_name }, status: row.status }
}

function shiftLabel(row) {
  const name = row.shift_key === 'day' ? '白班' : row.shift_key === 'evening' ? '小夜班' : '大夜班'
  return `${name} ${hhmm(row.starts_at)}-${hhmm(row.ends_at)}`
}

function hhmm(value) {
  return new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }).format(new Date(value))
}

function formatAdmission(row) {
  return { admissionId: row.admission_id, patientId: row.patient_id, bedId: row.bed_id, bedLabel: row.bed_label, patientName: row.patient_name, diagnosis: row.diagnosis, sex: row.sex, age: Number(row.age), admittedAt: row.admitted_at, attendingPhysician: row.attending_physician }
}

async function formatAssessment(row) {
  const values = await query(
    `
    select bf.code, bf.category, bf.value_type, bv.number_value, bv.boolean_value, bv.level_value
    from burden_values bv
    join burden_factors bf on bf.id = bv.factor_id
    where bv.assessment_id = $1
    `,
    [row.id],
  )
  const objective = {}
  const subjective = {}
  for (const item of values.rows) {
    const value = item.value_type === 'boolean' ? item.boolean_value : item.value_type === 'level' ? Number(item.level_value) : item.number_value == null ? null : Number(item.number_value)
    if (item.category === 'objective') objective[item.code] = value
    else subjective[item.code] = value
  }
  return { assessmentId: row.id, admissionId: row.admission_id, bedLabel: row.bed_label, diagnosis: row.diagnosis, objective, subjective: Object.keys(subjective).length ? subjective : null, score: { objectiveTotal: Number(row.objective_total), subjectiveTotal: Number(row.subjective_total), totalScore: Number(row.total_score), level: burdenLevel(Number(row.total_score)) }, status: row.status, submittedAt: row.submitted_at, updatedAt: row.updated_at }
}

function normalizeSubjective(input) {
  return { rassScore: input.rassScore ?? null, agitatedFallRisk: Boolean(input.agitatedFallRisk), agitatedTubeRemovalRisk: Boolean(input.agitatedTubeRemovalRisk), drainageTube: Boolean(input.drainageTube), tubeFeeding: Boolean(input.tubeFeeding), dressingChangeFrequency: Number(input.dressingChangeFrequency ?? 0), vitalMonitoringFrequency: Number(input.vitalMonitoringFrequency ?? 0) }
}

async function upsertSubjectiveValue(client, assessmentId, factorId, code, valueType, value) {
  if (value == null) {
    await client.query('delete from burden_values where assessment_id = $1 and factor_id = $2', [assessmentId, factorId])
    return
  }
  const numberValue = valueType === 'number' ? value : null
  const booleanValue = valueType === 'boolean' ? Boolean(value) : null
  const levelValue = valueType === 'level' ? Number(value) : null
  const points = valueType === 'boolean' ? (value ? 2 : 0) : valueType === 'level' ? Number(value) : rassPoints(value)
  await client.query(
    `
    insert into burden_values (assessment_id, factor_id, number_value, boolean_value, level_value, points)
    values ($1,$2,$3,$4,$5,$6)
    on conflict (assessment_id, factor_id) do update set
      number_value = excluded.number_value,
      boolean_value = excluded.boolean_value,
      level_value = excluded.level_value,
      points = excluded.points
    `,
    [assessmentId, factorId, numberValue, booleanValue, levelValue, points],
  )
}

function subjectiveScore(s) {
  return rassPoints(s.rassScore) + (s.agitatedFallRisk ? 2 : 0) + (s.agitatedTubeRemovalRisk ? 2 : 0) + (s.drainageTube ? 2 : 0) + (s.tubeFeeding ? 2 : 0) + Number(s.dressingChangeFrequency ?? 0) + Number(s.vitalMonitoringFrequency ?? 0)
}

function rassPoints(value) {
  if (value == null || Number.isNaN(Number(value))) return 0
  const abs = Math.abs(Number(value))
  if (abs <= 1) return 0
  if (abs <= 3) return 1
  return 2
}

function burdenLevel(score) {
  if (score >= 22) return '高'
  if (score >= 14) return '中'
  return '低'
}

function taskSelectSql(where) {
  return `
    select t.*, b.label || ' - ' || a.diagnosis as bed_label
    from tasks t
    join admissions a on a.id = t.admission_id
    join beds b on b.id = a.bed_id
    where ${where.join(' and ')}
    order by t.status, t.urgent desc, b.bed_no
  `
}

function formatTask(row) {
  const bedOnly = row.bed_label?.includes(' - ') ? row.bed_label.split(' - ')[0] : row.bed_label
  return {
    id: row.id,
    admissionId: row.admission_id,
    bedLabel: bedOnly,
    bedDetail: row.bed_label,
    title: row.title,
    kind: row.kind,
    urgent: row.urgent,
    status: row.status,
    done: row.status === 'done',
    completedAt: row.completed_at,
    createdAt: row.created_at,
    points: taskPoints(row),
    source: row.source,
  }
}

function taskPoints(task) {
  const base = task.kind === '給藥' ? 3 : task.kind === '檢查' || task.kind === '監測' ? 2 : 1
  return base + (task.urgent ? 2 : 0)
}

async function admissionsWithScores(shiftId) {
  const rows = await listAdmissions({ shiftId, status: 'active' })
  return Promise.all(rows.map(async (admission) => ({ ...admission, score: await scoreForAdmission(admission.admissionId) })))
}

async function scoreForAdmission(admissionId) {
  const result = await query('select total_score from burden_assessments where admission_id = $1', [admissionId])
  return Number(result.rows[0]?.total_score ?? 0)
}

async function allocationRunRow(id) {
  const result = await query('select * from allocation_runs where id = $1', [id])
  if (!result.rows[0]) throw new ApiError(404, 'ALLOCATION_RUN_NOT_FOUND', '找不到分床執行紀錄', { allocationRunId: id })
  return result.rows[0]
}

function allocationPatient(admission, score, isManualOverride) {
  if (!admission) return null
  return { admissionId: admission.admissionId, bedLabel: admission.bedLabel, patientName: admission.patientName, diagnosis: admission.diagnosis, score, tone: score >= 22 ? 'high' : score >= 14 ? 'mid' : 'low', isManualOverride }
}

async function latestAllocation(shiftId) {
  const result = await query(
    `select id from allocation_runs where shift_id = $1 order by (status = 'draft') desc, suggested_at desc limit 1`,
    [shiftId],
  )
  if (!result.rows[0]) return emptyAllocationForShift(shiftId)
  return getAllocationRun({ allocationRunId: result.rows[0].id })
}

async function emptyAllocationForShift(shiftId) {
  const nurses = (await listNurses({ shiftId })).filter((nurse) => ['nurse', 'charge_nurse'].includes(nurse.role))
  const admissions = await listAdmissions({ shiftId, status: 'active' })
  const byNurse = nurses.map((nurse) => ({
    nurseId: nurse.id,
    shortName: nurse.shortName,
    load: 0,
    patients: [],
  }))
  const unassigned = admissions.map((admission) => allocationPatient(admission, 0, false))
  return {
    allocationRunId: null,
    shiftId,
    targetShiftId: null,
    status: 'none',
    algorithmVersion: null,
    suggestedAt: null,
    confirmedAt: null,
    unassigned,
    byNurse,
    stats: {
      totalBeds: admissions.length,
      totalNurses: nurses.length,
      averageLoad: 0,
      maxLoad: 0,
    },
  }
}

async function admissionOwner(shiftId, admissionId) {
  const result = await query(
    `
    select ai.nurse_id
    from allocation_items ai
    join allocation_runs ar on ar.id = ai.allocation_run_id
    where ar.shift_id = $1 and ai.admission_id = $2
    order by ar.confirmed_at desc nulls last, ar.suggested_at desc
    limit 1
    `,
    [shiftId, admissionId],
  )
  return result.rows[0] ? { nurseId: result.rows[0].nurse_id } : null
}

async function ensureBurdenAssessmentsForShift(shiftId) {
  const admissions = await listAdmissions({ shiftId, status: 'active' })
  for (const admission of admissions) {
    const exists = await query(
      'select id from burden_assessments where shift_id = $1 and admission_id = $2',
      [shiftId, admission.admissionId],
    )
    if (exists.rows[0]) continue

    const template = await query(
      `
      select ba.*
      from burden_assessments ba
      where ba.admission_id = $1
      order by ba.updated_at desc
      limit 1
      `,
      [admission.admissionId],
    )
    const templateRow = template.rows[0]
    const assessmentId = randomUUID()
    const objectiveTotal = templateRow ? Number(templateRow.objective_total) : 0

    await query(
      `
      insert into burden_assessments (
        id, shift_id, admission_id, submitted_by, status,
        objective_total, subjective_total, total_score
      ) values ($1, $2, $3, null, 'draft', $4, 0, $4)
      `,
      [assessmentId, shiftId, admission.admissionId, objectiveTotal],
    )

    if (!templateRow) continue

    const values = await query(
      `
      select bv.number_value, bv.boolean_value, bv.level_value, bv.points, bf.code, bf.value_type
      from burden_values bv
      join burden_factors bf on bf.id = bv.factor_id
      where bv.assessment_id = $1 and bf.category = 'objective'
      `,
      [templateRow.id],
    )
    for (const value of values.rows) {
      const factor = await query('select id from burden_factors where code = $1', [value.code])
      if (!factor.rows[0]) continue
      await query(
        `
        insert into burden_values (assessment_id, factor_id, number_value, boolean_value, level_value, points)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (assessment_id, factor_id) do nothing
        `,
        [
          assessmentId,
          factor.rows[0].id,
          value.number_value,
          value.boolean_value,
          value.level_value,
          value.points,
        ],
      )
    }
  }
}

async function buildHandoffSnapshotSummary(row) {
  const allocation = await getAllocationRun({ allocationRunId: row.id })
  const tasksResult = await listTasks({ shiftId: row.shift_id, assignee: 'all' })
  const urgentOpen = tasksResult.data.filter((task) => task.urgent && !task.done).length
  const openTasks = tasksResult.data.filter((task) => !task.done).length
  const patientCount = allocation.byNurse.reduce((sum, nurse) => sum + nurse.patients.length, 0)
  return {
    id: row.id,
    allocationRunId: row.id,
    shiftId: row.shift_id,
    shiftKey: row.shift_key,
    shiftLabel: shiftLabel(row),
    createdAt: row.confirmed_at,
    createdBy: row.created_by_name ?? '小組長',
    summary: {
      patientCount,
      nurseCount: allocation.byNurse.length,
      statTotal: urgentOpen,
      taskTotal: tasksResult.meta.counts.total,
      taskOpen: openTasks,
      taskUrgentOpen: urgentOpen,
      avgLoad: allocation.stats.averageLoad,
      maxLoad: allocation.stats.maxLoad,
    },
  }
}

function bedNo(label) {
  const match = label.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}
