import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
    select s.*, n.short_name as charge_short_name,
           (select json_agg(nurse_id) from shift_nurses where shift_id = s.id) as nurse_ids
    from shifts s
    left join nurses n on n.id = s.charge_nurse_id
    where s.unit_name = $1
    order by s.starts_at desc
    `,
    [unitName],
  )
  return result.rows.map(formatShift)
}

export async function listStatOrders({ shiftId, includeCompleted = false, assignee = 'all', userId = ids.currentNurse } = {}) {
  const statusFilter = includeCompleted ? "so.status in ('pending', 'done')" : "so.status = 'pending'"
  const params = [shiftId]
  let ownerWhere = ''
  if (assignee === 'me') {
    params.push(userId)
    ownerWhere = `
      and so.admission_id in (
        select ai.admission_id
        from allocation_items ai
        join allocation_runs ar on ar.id = ai.allocation_run_id
        where coalesce(ar.target_shift_id, ar.shift_id) = $1 and ai.nurse_id = $${params.length}
      )
    `
  }
  const result = await query(
    `
    select so.id, so.admission_id, so.title, so.kind,
           so.ordered_by, so.ordered_at_display, so.reason, so.status,
           b.label as bed_label, a.diagnosis
    from stat_orders so
    join admissions a on a.id = so.admission_id
    join beds b on b.id = a.bed_id
    where so.shift_id = $1 and ${statusFilter}${ownerWhere}
    order by so.status asc, so.ordered_at_display asc
    `,
    params,
  )
  return result.rows.map((r) => ({
    id: r.id,
    admissionId: r.admission_id,
    bedLabel: r.bed_label,
    diagnosis: r.diagnosis,
    title: r.title,
    kind: r.kind,
    orderedBy: r.ordered_by,
    orderedAt: r.ordered_at_display,
    reason: r.reason ?? undefined,
    status: r.status,
  }))
}

export async function updateStatOrder({ orderId, patch, userId = ids.currentNurse } = {}) {
  if (!['pending', 'done', 'cancelled'].includes(patch.status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status: patch.status })
  }
  await getCurrentUser(userId)
  const result = await query(
    `
    update stat_orders
    set status = $2::varchar
    where id = $1
    returning id, admission_id, title, kind, ordered_by, ordered_at_display, reason, status
    `,
    [orderId, patch.status],
  )
  if (!result.rows[0]) throw new ApiError(404, 'STAT_ORDER_NOT_FOUND', '找不到 STAT 醫囑', { orderId })
  const row = result.rows[0]
  const bed = await query(
    `
    select b.label as bed_label, a.diagnosis
    from admissions a
    join beds b on b.id = a.bed_id
    where a.id = $1
    `,
    [row.admission_id],
  )
  return {
    id: row.id,
    admissionId: row.admission_id,
    bedLabel: bed.rows[0]?.bed_label ?? '—',
    diagnosis: bed.rows[0]?.diagnosis ?? '',
    title: row.title,
    kind: row.kind,
    orderedBy: row.ordered_by,
    orderedAt: row.ordered_at_display,
    reason: row.reason ?? undefined,
    status: row.status,
  }
}

export async function createStatOrder({ shiftId, admissionId, title, kind, orderedBy, reason, userId = ids.currentNurse } = {}) {
  await getCurrentUser(userId)
  
  if (!['給藥', '檢查', '監測', '治療', '其他'].includes(kind)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'kind 參數不合法', { kind })
  }

  const now = new Date()
  const orderedAtDisplay = new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }).format(now)

  const result = await query(
    `
    insert into stat_orders (shift_id, admission_id, title, kind, ordered_by, ordered_at_display, reason)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning id, admission_id, title, kind, ordered_by, ordered_at_display, reason, status
    `,
    [shiftId, admissionId, title, kind, orderedBy ?? '醫師', orderedAtDisplay, reason || null]
  )
  
  const row = result.rows[0]
  const bed = await query(
    `
    select b.label as bed_label, a.diagnosis
    from admissions a
    join beds b on b.id = a.bed_id
    where a.id = $1
    `,
    [row.admission_id],
  )
  return {
    id: row.id,
    admissionId: row.admission_id,
    bedLabel: bed.rows[0]?.bed_label ?? '—',
    diagnosis: bed.rows[0]?.diagnosis ?? '',
    title: row.title,
    kind: row.kind,
    orderedBy: row.ordered_by,
    orderedAt: row.ordered_at_display,
    reason: row.reason ?? undefined,
    status: row.status,
  }
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
  let selectRole = 'u.role as role'
  let where = 'where n.is_active = true'
  if (shiftId) {
    params.push(shiftId)
    join = 'join shift_nurses sn on sn.nurse_id = n.id'
    selectRole = 'coalesce(sn.role, u.role) as role'
    where += ' and sn.shift_id = $1'
  }
  const result = await query(
    `
    select n.id, n.display_name, n.short_name, n.seniority_level, n.is_active,
      ${selectRole}
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
    where coalesce(ar.target_shift_id, ar.shift_id) = $1 and ai.nurse_id = $2
    order by ai.sort_order
    `,
    [shift.id, user.id],
  )
  const assignedIds = new Set(assigned.rows.map((row) => row.admission_id))

  const date = new Date(shift.starts_at)
  const localDateStr = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei'
  }).format(date).replace(/\//g, '-')

  const dailyShiftsResult = await query(
    `
    select s.*, n.short_name as charge_short_name
    from shifts s
    left join nurses n on n.id = s.charge_nurse_id
    where (s.starts_at at time zone 'Asia/Taipei')::date = $1::date
    order by s.starts_at
    `,
    [localDateStr]
  )
  
  const dailyShiftIds = dailyShiftsResult.rows.map(s => s.id)
  let dailyRoster = []
  if (dailyShiftIds.length > 0) {
    const shiftNursesResult = await query(
      `
      select sn.shift_id, sn.role, n.id as nurse_id, n.short_name, n.display_name, n.seniority_level
      from shift_nurses sn
      join nurses n on n.id = sn.nurse_id
      where sn.shift_id = any($1)
      `,
      [dailyShiftIds]
    )
    
    dailyRoster = dailyShiftsResult.rows.map(s => {
      const nurses = shiftNursesResult.rows
        .filter(sn => sn.shift_id === s.id)
        .map(sn => ({
          id: sn.nurse_id,
          shortName: sn.short_name,
          displayName: sn.display_name,
          seniorityLevel: sn.seniority_level,
          role: sn.role
        }))
      return {
        id: s.id,
        shiftKey: s.shift_key,
        startsAt: s.starts_at.toISOString ? s.starts_at.toISOString() : s.starts_at,
        endsAt: s.ends_at.toISOString ? s.ends_at.toISOString() : s.ends_at,
        status: s.status,
        chargeNurseId: s.charge_nurse_id,
        chargeNurseName: s.charge_short_name ?? '—',
        nurses
      }
    })
  }

  return {
    shift: { id: shift.id, label: shiftLabel(shift) },
    onDutyCharge: await resolveOnDutyCharge(shift),
    myPatients: allPatients.filter((admission) => assignedIds.has(admission.admissionId)),
    allPatients,
    dailyRoster
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
        where ai.nurse_id = $2
          and ai.allocation_run_id = (
            select id from allocation_runs
            where coalesce(target_shift_id, shift_id) = $1
            order by (status = 'draft') desc, suggested_at desc
            limit 1
          )
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

export async function listTasks({ shiftId, assignee = 'me', status, kind, urgent, admissionId, userId = ids.currentNurse } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  const params = [shiftId]
  const where = ['t.shift_id = $1']
  if (admissionId) {
    params.push(admissionId)
    where.push(`t.admission_id = $${params.length}`)
  }
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
  
  // Update 'all' query logic to respect admissionId if provided
  const allWhere = ['t.shift_id = $1']
  const allParams = [shiftId]
  if (admissionId) {
    allParams.push(admissionId)
    allWhere.push(`t.admission_id = $${allParams.length}`)
  }
  if (assignee === 'me') {
    allParams.push(userId)
    allWhere.push(`t.assigned_nurse_id = $${allParams.length}`)
  }
  const all = await query(taskSelectSql(allWhere), allParams)
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
  const user = await getCurrentUser(userId)
  const isLeader = ['charge_nurse', 'admin'].includes(user.role)
  const result = await query(
    `
    update tasks
    set status = $2::varchar,
      completed_at = case when $2::varchar = 'done' then now() else null end,
      completed_by = case when $2::varchar = 'done' then $3::uuid else null end
    where id = $1 ${isLeader ? '' : 'and assigned_nurse_id = $3'}
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

export async function suggestAllocationRun({ shiftId, targetShiftId, userId = ids.chargeNurse, dryRun = false } = {}) {
  const user = await getCurrentUser(userId)
  if (!['charge_nurse', 'admin'].includes(user.role)) throw new ApiError(403, 'FORBIDDEN', '只有小組長或管理者可以產生分床建議')

  const nextShiftId = targetShiftId || await getNextShiftId(shiftId) || shiftId
  const allAdmissions = await admissionsWithScores(shiftId)
  const allNurses = (await listNurses({ shiftId: nextShiftId })).filter((n) => ['nurse', 'charge_nurse'].includes(n.role) && n.isActive)

  const shiftRow = await query('select shift_key from shifts where id = $1', [shiftId])
  const isNightShift = shiftRow.rows[0]?.shift_key === 'night'
  const MAX_NURSE_BEDS = isNightShift ? 3 : 2
  const MAX_CHARGE_BEDS = 1
  const MAX_BED_GAP = 2

  const seniorityKey = (n) => (n.role === 'charge_nurse' ? 'charge_nurse' : (n.seniorityLevel ?? '4-10年'))

  // 年資由淺到深排序（rank 小 = 年資淺，charge_nurse 排最後）
  const nursesByJuniority = [...allNurses].sort(
    (a, b) => (SENIORITY_RANK[seniorityKey(a)] ?? 2) - (SENIORITY_RANK[seniorityKey(b)] ?? 2),
  )

  // 病人由高分到低分排序（主觀 + 客觀已合併於 total_score）
  const patientsByScore = [...allAdmissions].sort((a, b) => b.score - a.score)

  // nurseId -> [patient, ...]；index 0 = Phase 1 分配的病人
  const assignments = new Map(allNurses.map((n) => [n.id, []]))
  const assigned = new Set()
  const currentLoads = new Map(allNurses.map((n) => [n.id, 0]))
  const avgScore = patientsByScore.length > 0
    ? patientsByScore.reduce((s, p) => s + p.score, 0) / patientsByScore.length
    : 0
  const decisionLogMap = new Map()

  const nurseSnapshot = (n, hasNearbyBed) => ({
    nurseId: n.id,
    shortName: n.shortName,
    displayName: n.shortName,
    seniorityLevel: seniorityKey(n),
    seniorityRank: SENIORITY_RANK[seniorityKey(n)] ?? 2,
    currentLoad: currentLoads.get(n.id) ?? 0,
    hasNearbyBed,
  })

  const regularNurses = nursesByJuniority.filter((n) => n.role !== 'charge_nurse')
  const chargeNurse = allNurses.find((n) => n.role === 'charge_nurse')

  const assignGroup = (nurseId, group, phase) => {
    const loadValues = [...currentLoads.values()]
    for (const patient of group) {
      decisionLogMap.set(patient.admissionId, {
        admissionId: patient.admissionId,
        bedLabel: patient.bedLabel,
        patientName: patient.patientName,
        score: patient.score,
        isHighBurden: patient.score >= avgScore,
        phase,
        minLoad: loadValues.length > 0 ? Math.min(...loadValues) : 0,
        candidates: allNurses.map((n) => nurseSnapshot(n, false)),
      })
      assignments.get(nurseId).push(patient)
      assigned.add(patient.admissionId)
      currentLoads.set(nurseId, (currentLoads.get(nurseId) ?? 0) + patient.score)
    }
  }

  // ── Phase 1：計算各護理師配床配額 ──
  // 所有護理師（含小組長）一起均分床位，小組長排最後故優先拿基本配額
  const nurseOrder = [...regularNurses, ...(chargeNurse ? [chargeNurse] : [])]
  const totalNurses = nurseOrder.length
  const baseQuota = totalNurses > 0 ? Math.floor(allAdmissions.length / totalNurses) : 0
  const extraCount = totalNurses > 0 ? allAdmissions.length % totalNurses : 0
  const nurseQuota = (i) => baseQuota + (i < extraCount ? 1 : 0)

  // ── Phase 2：依配額貪婪形成 ±MAX_BED_GAP 的床位組 ──
  const sortedByBed = [...allAdmissions].sort((a, b) => bedNo(a.bedLabel) - bedNo(b.bedLabel))
  const nurseGroups = []
  let bedIdx = 0

  for (let n = 0; n < totalNurses; n++) {
    const quota = nurseQuota(n)
    const group = []
    while (group.length < quota && bedIdx < sortedByBed.length) {
      const candidate = sortedByBed[bedIdx]
      const testLabels = [...group.map((p) => p.bedLabel), candidate.bedLabel]
      if (group.length === 0 || maxPairWalkDist(testLabels) <= MAX_BED_GAP) {
        group.push(candidate)
        bedIdx++
      } else {
        break
      }
    }
    nurseGroups.push(group)
  }

  // ── Phase 3：輕重混配優化（鄰組間單一病人交換）──
  // 目標：每個有 ≥2 床的護理師至少有一高分（≥均值）和一低分（<均值）病人
  // 硬約束：交換後兩組均需維持 ±MAX_BED_GAP；否則不交換
  const groupHasMix = (g) =>
    g.length <= 1 || (g.some((p) => p.score >= avgScore) && g.some((p) => p.score < avgScore))
  const groupBedValid = (g) => {
    if (g.length <= 1) return true
    return maxPairWalkDist(g.map((p) => p.bedLabel)) <= MAX_BED_GAP
  }

  for (let i = 0; i < nurseGroups.length - 1; i++) {
    if (groupHasMix(nurseGroups[i]) && groupHasMix(nurseGroups[i + 1])) continue
    let swapped = false
    outer: for (const pa of [...nurseGroups[i]]) {
      for (const pb of [...nurseGroups[i + 1]]) {
        if ((pa.score >= avgScore) === (pb.score >= avgScore)) continue
        const newGa = [...nurseGroups[i].filter((p) => p !== pa), pb]
        const newGb = [...nurseGroups[i + 1].filter((p) => p !== pb), pa]
        if (groupBedValid(newGa) && groupBedValid(newGb)) {
          const before = (groupHasMix(nurseGroups[i]) ? 1 : 0) + (groupHasMix(nurseGroups[i + 1]) ? 1 : 0)
          const after = (groupHasMix(newGa) ? 1 : 0) + (groupHasMix(newGb) ? 1 : 0)
          if (after > before) {
            nurseGroups[i] = newGa
            nurseGroups[i + 1] = newGb
            swapped = true
            break outer
          }
        }
      }
    }
    if (swapped) i = Math.max(-1, i - 1)
  }

  // ── Phase 4：依負擔重新指派組別（小組長拿最輕、資深拿較輕）──
  const groupScores = nurseGroups.map((g) => g.reduce((s, p) => s + p.score, 0))
  const sortedGroupIndices = nurseGroups.map((_, i) => i).sort((a, b) => groupScores[a] - groupScores[b])

  if (chargeNurse) {
    // 小組長取最輕的組
    const lightestIdx = sortedGroupIndices[0]
    if (nurseGroups[lightestIdx]?.length > 0) {
      assignGroup(chargeNurse.id, nurseGroups[lightestIdx], 1)
    }
    // 剩餘組（輕→重）依序分給一般護理師（資深→資淺）
    const remainingIndices = sortedGroupIndices.slice(1)
    const regularBySeniority = [...regularNurses].sort(
      (a, b) => (SENIORITY_RANK[seniorityKey(b)] ?? 2) - (SENIORITY_RANK[seniorityKey(a)] ?? 2),
    )
    for (let i = 0; i < regularBySeniority.length; i++) {
      const gIdx = remainingIndices[i]
      if (gIdx !== undefined && nurseGroups[gIdx]?.length > 0) {
        assignGroup(regularBySeniority[i].id, nurseGroups[gIdx], 1)
      }
    }
  } else {
    // 無小組長：資深→資淺，對應最輕→最重
    const nursesBySeniority = [...regularNurses].sort(
      (a, b) => (SENIORITY_RANK[seniorityKey(b)] ?? 2) - (SENIORITY_RANK[seniorityKey(a)] ?? 2),
    )
    for (let i = 0; i < nursesBySeniority.length; i++) {
      const gIdx = sortedGroupIndices[i]
      if (gIdx !== undefined && nurseGroups[gIdx]?.length > 0) {
        assignGroup(nursesBySeniority[i].id, nurseGroups[gIdx], 1)
      }
    }
  }

  // ── Phase 5：溢出病人（±2 無法滿足配額時仍未分配的病人）──
  const overflow = allAdmissions.filter((p) => !assigned.has(p.admissionId))
  for (const patient of overflow.sort((a, b) => b.score - a.score)) {
    const pool = nurseOrder
    const nearbySet = new Set(
      pool
        .filter((n) => assignments.get(n.id).some((p) => walkDist(p.bedLabel, patient.bedLabel) <= MAX_BED_GAP))
        .map((n) => n.id),
    )
    const candidates = nearbySet.size > 0 ? pool.filter((n) => nearbySet.has(n.id)) : pool
    if (candidates.length === 0) continue

    const selected = [...candidates].sort(
      (a, b) =>
        assignments.get(a.id).reduce((s, p) => s + p.score, 0) -
        assignments.get(b.id).reduce((s, p) => s + p.score, 0),
    )[0]

    decisionLogMap.set(patient.admissionId, {
      admissionId: patient.admissionId,
      bedLabel: patient.bedLabel,
      patientName: patient.patientName,
      score: patient.score,
      isHighBurden: patient.score >= avgScore,
      phase: 2,
      minLoad: Math.min(...pool.map((n) => currentLoads.get(n.id) ?? 0)),
      candidates: pool.map((n) => nurseSnapshot(n, nearbySet.has(n.id))),
    })

    assignments.get(selected.id).push(patient)
    assigned.add(patient.admissionId)
    currentLoads.set(selected.id, (currentLoads.get(selected.id) ?? 0) + patient.score)
  }

  // 整理 decision logs（Phase 3 可能調換 chosenNurseId，以 assignments 最終結果為準）
  const decisionLogs = []
  for (const nurse of allNurses) {
    for (const patient of assignments.get(nurse.id)) {
      const entry = decisionLogMap.get(patient.admissionId)
      decisionLogs.push(
        entry
          ? { ...entry, chosenNurseId: nurse.id }
          : {
              admissionId: patient.admissionId,
              bedLabel: patient.bedLabel,
              patientName: patient.patientName,
              score: patient.score,
              isHighBurden: patient.score >= avgScore,
              phase: null,
              minLoad: 0,
              candidates: [],
              chosenNurseId: nurse.id,
            },
      )
    }
  }

  if (dryRun) return { decisionLogs }

  const runId = randomUUID()
  const sortOrders = new Map(allNurses.map((n) => [n.id, 0]))
  await withTransaction(async (client) => {
    await client.query(
      `insert into allocation_runs (id, shift_id, target_shift_id, created_by, status, algorithm_version) values ($1,$2,$3,$4,'draft','bed-proximity-v4')`,
      [runId, shiftId, nextShiftId, user.id],
    )
    for (const log of decisionLogs) {
      const sortOrder = (sortOrders.get(log.chosenNurseId) ?? 0) + 1
      await client.query(
        `insert into allocation_items (allocation_run_id, admission_id, nurse_id, score, sort_order) values ($1,$2,$3,$4,$5)`,
        [runId, log.admissionId, log.chosenNurseId, log.score, sortOrder],
      )
      sortOrders.set(log.chosenNurseId, sortOrder)
    }
    await client.query(
      `update allocation_runs set decision_logs = $2::jsonb where id = $1`,
      [runId, JSON.stringify(decisionLogs)],
    )
  })
  return getAllocationRun({ allocationRunId: runId })
}

export async function getLatestAllocationRun({ shiftId } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  const result = await query(
    `select id from allocation_runs where shift_id = $1 order by (status = 'confirmed') desc, suggested_at desc limit 1`,
    [shiftId],
  )
  if (!result.rows[0]) return null
  return getAllocationRun({ allocationRunId: result.rows[0].id })
}

export async function getAllocationRun({ allocationRunId } = {}) {
  const run = await allocationRunRow(allocationRunId)
  const nurses = (await listNurses({ shiftId: run.target_shift_id ?? run.shift_id })).filter((nurse) => ['nurse', 'charge_nurse'].includes(nurse.role))
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
    decisionLogs: run.decision_logs ?? null,
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

export async function confirmAllocationRun({ allocationRunId, userId } = {}) {
  const run = await getAllocationRun({ allocationRunId })
  if (run.unassigned.length > 0) {
    throw new ApiError(409, 'ALLOCATION_INCOMPLETE', '仍有病患尚未分配', { unassigned: run.unassigned.map((item) => item.admissionId) })
  }
  await withTransaction(async (client) => {
    await client.query(
      `update allocation_runs set status = 'confirmed', confirmed_at = now(), created_by = coalesce($2::uuid, created_by) where id = $1`,
      [allocationRunId, userId ?? null],
    )
    await persistHandoffSnapshot(client, { allocationRunId, userId, run })
  })
  return getAllocationRun({ allocationRunId })
}

export async function revertAllocationRunToDraft({ allocationRunId } = {}) {
  await withTransaction(async (client) => {
    await client.query(
      `update allocation_runs set status = 'draft', confirmed_at = null where id = $1`,
      [allocationRunId],
    )
    await client.query(
      `delete from handoff_snapshots where allocation_run_id = $1`,
      [allocationRunId],
    )
  })
  return getAllocationRun({ allocationRunId })
}

export async function getWarRoom({ shiftId } = {}) {
  const allocation = await latestConfirmedAllocation(shiftId)
  const allocationRunId = allocation.allocationRunId
  const tasksResult = await listTasks({ shiftId, assignee: 'all' })
  const statTasks = (await listStatOrders({ shiftId, includeCompleted: true })).map(formatStatOrderAsTask)
  const allTasks = [...tasksResult.data, ...statTasks]

  const ownerCache = new Map()
  const resolveOwner = async (admissionId) => {
    if (!ownerCache.has(admissionId)) {
      if (!allocationRunId) {
        ownerCache.set(admissionId, null)
      } else {
        const result = await query(
          'select nurse_id from allocation_items where allocation_run_id = $1 and admission_id = $2',
          [allocationRunId, admissionId],
        )
        ownerCache.set(admissionId, result.rows[0] ? { nurseId: result.rows[0].nurse_id } : null)
      }
    }
    return ownerCache.get(admissionId)
  }

  const tasksByNurse = new Map()
  for (const task of allTasks) {
    const admission = await resolveOwner(task.admissionId)
    if (!admission) continue
    const list = tasksByNurse.get(admission.nurseId) ?? []
    if (list.some((item) => item.id === task.id)) continue
    list.push({ ...task, assignedNurseId: admission.nurseId })
    tasksByNurse.set(admission.nurseId, list)
  }

  const nurses = allocation.byNurse
    .map((row) => {
      const nurseTasks = (tasksByNurse.get(row.nurseId) ?? []).sort(warRoomTaskSort)
      const remaining = nurseTasks.filter((task) => !task.done).reduce((sum, task) => sum + task.points, 0)
      return { ...row, remaining, tasks: nurseTasks }
    })
    .filter((row) => row.patients.length > 0 || row.tasks.length > 0)

  const openTasks = allTasks.filter((task) => !task.done)
  return {
    overview: {
      nurseCount: nurses.length,
      totalTasks: allTasks.length,
      doneTasks: allTasks.filter((task) => task.done).length,
      pendingTasks: openTasks.length,
      urgentOpenTasks: openTasks.filter((task) => task.urgent).length,
    },
    nurses,
  }
}

export async function getHandoffSheet({ shiftId } = {}) {
  const snapshot = await query(
    `
    select id, allocation_run_id, created_at
    from handoff_snapshots
    where shift_id = $1
    order by created_at desc
    limit 1
    `,
    [shiftId],
  )
  if (!snapshot.rows[0]) {
    return { snapshotId: null, allocationRunId: null, createdAt: null, rows: [] }
  }
  const rowResult = await query(
    `select * from handoff_rows where snapshot_id = $1 order by sort_order`,
    [snapshot.rows[0].id],
  )
  return {
    snapshotId: snapshot.rows[0].id,
    allocationRunId: snapshot.rows[0].allocation_run_id,
    createdAt: snapshot.rows[0].created_at,
    rows: rowResult.rows.map(formatHandoffRowFromDb),
  }
}

export async function listHandoffSnapshots({ shiftId } = {}) {
  const params = []
  let where = ''
  if (shiftId) {
    params.push(shiftId)
    where = `where hs.shift_id = $${params.length}`
  }
  const result = await query(
    `
    select hs.*, s.shift_key, s.starts_at, s.ends_at, n.short_name as created_by_name
    from handoff_snapshots hs
    join shifts s on s.id = hs.shift_id
    left join nurses n on n.id = hs.created_by
    ${where}
    order by hs.created_at desc
    `,
    params,
  )
  return result.rows.map(formatHandoffSnapshotListItem)
}

export async function getHandoffSnapshot({ snapshotId, allocationRunId } = {}) {
  const lookupId = snapshotId ?? allocationRunId
  if (!lookupId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'snapshotId 為必填', { field: 'snapshotId' })
  }
  const row = await query(
    `
    select hs.*, s.shift_key, s.starts_at, s.ends_at, n.short_name as created_by_name
    from handoff_snapshots hs
    join shifts s on s.id = hs.shift_id
    left join nurses n on n.id = hs.created_by
    where hs.id = $1 or hs.allocation_run_id = $1
    limit 1
    `,
    [lookupId],
  )
  if (!row.rows[0]) throw new ApiError(404, 'SNAPSHOT_NOT_FOUND', '找不到交班快照', { snapshotId: lookupId })
  const snapshot = row.rows[0]
  return {
    ...formatHandoffSnapshotListItem(snapshot),
    allocation: {
      unassignedCount: snapshot.unassigned_count,
      stats: {
        totalBeds: snapshot.total_beds,
        totalNurses: snapshot.total_nurses,
        averageLoad: Number(snapshot.avg_load),
        maxLoad: snapshot.max_load,
      },
    },
    nurseBlocks: parseNurseBlocks(snapshot.nurse_blocks),
  }
}

async function currentShiftRow(unitName = 'ICU') {
  const result = await query(
    `
    select s.*, n.short_name as charge_short_name,
           (select json_agg(nurse_id) from shift_nurses where shift_id = s.id) as nurse_ids
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

async function getNextShiftId(shiftId) {
  const result = await query(
    `
    select s.id
    from shifts s
    join shifts cur on cur.id = $1
    where s.unit_name = cur.unit_name
      and s.starts_at >= cur.ends_at
      and s.status <> 'closed'
      and s.hidden = false
    order by s.starts_at asc
    limit 1
    `,
    [shiftId],
  )
  return result.rows[0]?.id ?? null
}


async function ensureShift(shiftId) {
  const result = await query(
    `select s.*, n.short_name as charge_short_name,
            (select json_agg(nurse_id) from shift_nurses where shift_id = s.id) as nurse_ids
     from shifts s
     left join nurses n on n.id = s.charge_nurse_id
     where s.id = $1`,
    [shiftId],
  )
  if (!result.rows[0]) throw new ApiError(404, 'SHIFT_NOT_FOUND', '找不到指定班別', { shiftId })
  return result.rows[0]
}

function formatShift(row) {
  return {
    id: row.id,
    shiftKey: row.shift_key,
    label: shiftLabel(row),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    chargeNurse: { id: row.charge_nurse_id, shortName: row.charge_short_name },
    status: row.status,
    hidden: row.hidden ?? false,
    nurseIds: row.nurse_ids || [],
  }
}

function shiftLabel(row) {
  const name = row.shift_key === 'day' ? '白班' : row.shift_key === 'evening' ? '小夜班' : '大夜班'
  const date = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Taipei',
  }).format(new Date(row.starts_at))
  return `${date} ${name} ${hhmm(row.starts_at)}-${hhmm(row.ends_at)}`
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
  // Fallback: if no objective values in DB (e.g. seed data only stored totals), use mock data
  if (Object.keys(objective).length === 0 && row.bed_label) {
    const mockData = getMockBurdenDataForBed(row.bed_label)
    if (mockData) Object.assign(objective, mockData.objective)
  }
  // Fallback: if no subjective values in DB, use mock data
  if (Object.keys(subjective).length === 0 && row.bed_label) {
    const mockData = getMockBurdenDataForBed(row.bed_label)
    if (mockData) Object.assign(subjective, mockData.subjective)
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

function statOrderKindToTaskKind(kind) {
  if (kind === '給藥' || kind === '檢查' || kind === '監測') return kind
  if (kind === '治療') return '給藥'
  return '紀錄'
}

function formatStatOrderAsTask(order) {
  const kind = statOrderKindToTaskKind(order.kind)
  return {
    id: `stat:${order.id}`,
    admissionId: order.admissionId,
    bedLabel: order.bedLabel,
    bedDetail: order.bedLabel,
    title: order.title,
    kind,
    urgent: true,
    status: order.status,
    done: order.status !== 'pending',
    completedAt: null,
    points: taskPoints({ kind, urgent: true }),
    source: 'STAT',
  }
}

function warRoomBedNo(label) {
  const match = label.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

function warRoomTaskSort(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done)
  if (a.urgent !== b.urgent) return Number(b.urgent) - Number(a.urgent)
  return warRoomBedNo(a.bedLabel) - warRoomBedNo(b.bedLabel)
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

async function latestAllocationForWarRoom(shiftId) {
  const confirmed = await query(
    `
    select id
    from allocation_runs
    where coalesce(target_shift_id, shift_id) = $1 and status = 'confirmed'
    order by confirmed_at desc nulls last, suggested_at desc
    limit 1
    `,
    [shiftId],
  )
  if (confirmed.rows[0]) {
    return getAllocationRun({ allocationRunId: confirmed.rows[0].id })
  }

  const draftWithItems = await query(
    `
    select ar.id
    from allocation_runs ar
    join allocation_items ai on ai.allocation_run_id = ar.id
    where coalesce(ar.target_shift_id, ar.shift_id) = $1 and ar.status = 'draft'
    group by ar.id
    having count(ai.id) > 0
    order by max(ar.suggested_at) desc
    limit 1
    `,
    [shiftId],
  )
  if (draftWithItems.rows[0]) {
    return getAllocationRun({ allocationRunId: draftWithItems.rows[0].id })
  }

  return emptyAllocationForShift(shiftId)
}

async function latestConfirmedAllocation(shiftId) {
  return latestAllocationForWarRoom(shiftId)
}

async function latestAllocation(shiftId) {
  const result = await query(
    `select id from allocation_runs where coalesce(target_shift_id, shift_id) = $1 order by (status = 'draft') desc, suggested_at desc limit 1`,
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
    where coalesce(ar.target_shift_id, ar.shift_id) = $1 and ai.admission_id = $2
    order by ar.confirmed_at desc nulls last, ar.suggested_at desc
    limit 1
    `,
    [shiftId, admissionId],
  )
  return result.rows[0] ? { nurseId: result.rows[0].nurse_id } : null
}


function getMockBurdenDataForBed(bedLabel) {
  try {
    const raw = readFileSync(resolve('backend/db/病人模擬資料.json'), 'utf8')
    const patients = JSON.parse(raw)
    const p = patients.find((item) => item['床號'] === bedLabel)
    if (!p) return null

    const objData = p['客觀評估'] || {}
    const subjData = p['主觀評估'] || {}

    // Map objective factors
    const objective = {
      negativePressureIsolation: Number(objData['是否需住在負壓隔離病房']?.['分數'] ?? 0),
      highVentilatorDemand: Number(objData['高呼吸器需求']?.['分數'] ?? 0),
      medicationTypeCount: Number(objData['藥物計數']?.['分數'] ?? 0),
      medicationFrequency: 0,
      frequentMonitoring: Number(objData['需頻繁監測生理狀態']?.['分數'] ?? 0),
      specialTube: Number(objData['是否具特殊管路']?.['分數'] ?? 0),
      pendingExaminations: Number(objData['待執行的特殊檢查項目']?.['分數'] ?? 0),
      crrtContinuousA: 0,
      iabpContinuousB: 0,
      ecmoContinuousB: 0,
      proneContinuousB: 0,
      hypothermiaContinuousB: 0,
      massiveTransfusionSingleC: 0,
      plasmaSingleC: 0,
      otherSpecialTreatment: 0,
    }

    // Map特殊處置
    const specialDispositions = objData['特殊處置']?.['系統帶入項目'] || []
    let recognizedSpecialTotal = 0
    for (const item of specialDispositions) {
      const name = item['項目'] || ''
      const score = Number(item['分數'] ?? 0)
      if (name.includes('CRRT')) { objective.crrtContinuousA = score; recognizedSpecialTotal += score }
      if (name.includes('IABP')) { objective.iabpContinuousB = score; recognizedSpecialTotal += score }
      if (name.includes('ECMO')) { objective.ecmoContinuousB = score; recognizedSpecialTotal += score }
      if (name.includes('PRONE')) { objective.proneContinuousB = score; recognizedSpecialTotal += score }
      if (name.includes('Cooling') || name.includes('低溫')) { objective.hypothermiaContinuousB = score; recognizedSpecialTotal += score }
      if (name.includes('Plasma') || name.includes('血漿')) { objective.plasmaSingleC = score; recognizedSpecialTotal += score }
      if (name.includes('Transfusion') || name.includes('輸血')) { objective.massiveTransfusionSingleC = score; recognizedSpecialTotal += score }
    }
    // 未被識別的特殊處置（Regular HD、EVD、TCP、VAC 等）→ 承接到 otherSpecialTreatment
    const specialCatScore = Number(objData['特殊處置']?.['分數'] ?? 0)
    objective.otherSpecialTreatment = Math.max(0, specialCatScore - recognizedSpecialTotal)

    // Map subjective factors
    let rassScore = null
    const rassResult = subjData['RASS鎮靜分數']?.['選擇結果'] || ''
    const rassMatch = rassResult.match(/RASS\s*=\s*([-+]?\d+)/i)
    if (rassMatch) {
      rassScore = Number(rassMatch[1])
    }

    const agitatedFallRisk = subjData['躁動且有下床風險']?.['選擇結果'] === '是'
    const agitatedTubeRemovalRisk = subjData['躁動且有自拔管路風險']?.['選擇結果'] === '是'
    
    // 引流管: 是否具特殊管路
    const drainageTube = objData['是否具特殊管路']?.['選擇項目'] !== '否' && objData['是否具特殊管路']?.['選擇項目'] !== '無'

    const tubeFeeding = subjData['是否需人工管灌']?.['選擇結果'] === '是'
    
    // 換藥頻繁程度: 是否需頻繁換藥
    const dressingChangeFrequency = subjData['是否需頻繁換藥']?.['選擇結果'] === '是' ? 1 : 0

    // 生理狀態監測頻繁程度: 需頻繁監測生理狀態
    const vitalMonitoringFrequency = objData['需頻繁監測生理狀態']?.['選擇項目'] === '是' ? 2 : 0

    const subjective = {
      rassScore,
      agitatedFallRisk,
      agitatedTubeRemovalRisk,
      drainageTube,
      tubeFeeding,
      dressingChangeFrequency,
      vitalMonitoringFrequency,
    }

    return { objective, subjective }
  } catch (error) {
    console.error('Failed to read mock patient burden data:', error)
    return null
  }
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

    if (templateRow) {
      const objectiveTotal = Number(templateRow.objective_total)
      await query(
        `
        insert into burden_assessments (
          id, shift_id, admission_id, submitted_by, status,
          objective_total, subjective_total, total_score
        ) values ($1, $2, $3, null, 'draft', $4, 0, $4)
        `,
        [assessmentId, shiftId, admission.admissionId, objectiveTotal],
      )

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
    } else {
      // No template found, load from mock patient data
      const mockData = getMockBurdenDataForBed(admission.bedLabel)
      if (mockData) {
        let objectiveTotal = 0
        let subjectiveTotal = 0

        const objectiveValues = []
        const subjectiveValues = []

        // Calculate and collect objective values
        for (const factor of objectiveFactorDefinitions) {
          const value = Number(mockData.objective[factor.code] ?? 0)
          objectiveTotal += value
          objectiveValues.push({
            code: factor.code,
            valueType: 'number',
            value,
            points: value,
          })
        }

        // Calculate and collect subjective values
        for (const factor of subjectiveFactorDefinitions) {
          const value = mockData.subjective[factor.code]
          let points = 0
          if (factor.valueType === 'boolean') {
            points = value ? 2 : 0
          } else if (factor.valueType === 'level') {
            points = Number(value ?? 0)
          } else {
            points = rassPoints(value)
          }
          subjectiveTotal += points
          subjectiveValues.push({
            code: factor.code,
            valueType: factor.valueType,
            value,
            points,
          })
        }

        const totalScore = objectiveTotal + subjectiveTotal

        await query(
          `
          insert into burden_assessments (
            id, shift_id, admission_id, submitted_by, status,
            objective_total, subjective_total, total_score
          ) values ($1, $2, $3, null, 'draft', $4, $5, $6)
          `,
          [assessmentId, shiftId, admission.admissionId, objectiveTotal, subjectiveTotal, totalScore],
        )

        // Insert into burden_values
        const allValues = [...objectiveValues, ...subjectiveValues]
        for (const item of allValues) {
          const factor = await query('select id from burden_factors where code = $1', [item.code])
          if (!factor.rows[0]) continue

          const numberValue = item.valueType === 'number' ? item.value : null
          const booleanValue = item.valueType === 'boolean' ? Boolean(item.value) : null
          const levelValue = item.valueType === 'level' ? Number(item.value ?? 0) : null

          await query(
            `
            insert into burden_values (assessment_id, factor_id, number_value, boolean_value, level_value, points)
            values ($1, $2, $3, $4, $5, $6)
            on conflict (assessment_id, factor_id) do nothing
            `,
            [
              assessmentId,
              factor.rows[0].id,
              numberValue,
              booleanValue,
              levelValue,
              item.points,
            ],
          )
        }
      } else {
        // Fallback if no mock data
        await query(
          `
          insert into burden_assessments (
            id, shift_id, admission_id, submitted_by, status,
            objective_total, subjective_total, total_score
          ) values ($1, $2, $3, null, 'draft', 0, 0, 0)
          `,
          [assessmentId, shiftId, admission.admissionId],
        )
      }
    }
  }
}

async function persistHandoffSnapshot(client, { allocationRunId, userId, run } = {}) {
  const existing = await client.query('select id from handoff_snapshots where allocation_run_id = $1', [allocationRunId])
  if (existing.rows[0]) return existing.rows[0].id

  const shiftId = run.targetShiftId ?? run.shiftId
  const admissions = await listAdmissions({ shiftId, status: 'active' })
  const burdens = await listBurdenAssessments({ shiftId, scope: 'all' })
  const statOrders = await listStatOrders({ shiftId })
  const burdenByAdmission = new Map(burdens.map((item) => [item.admissionId, item]))
  const nurseBlocks = buildNurseBlocks(run)
  const patientCount = run.byNurse.reduce((sum, nurse) => sum + nurse.patients.length, 0)

  const snapshotResult = await client.query(
    `
    insert into handoff_snapshots (
      allocation_run_id, shift_id, created_by,
      patient_count, nurse_count, stat_total,
      avg_load, max_load, unassigned_count,
      total_beds, total_nurses, nurse_blocks
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
    returning id
    `,
    [
      allocationRunId,
      shiftId,
      userId ?? null,
      patientCount,
      run.byNurse.length,
      statOrders.length,
      run.stats.averageLoad,
      run.stats.maxLoad,
      run.unassigned.length,
      run.stats.totalBeds,
      run.stats.totalNurses,
      JSON.stringify(nurseBlocks),
    ],
  )
  const snapshotId = snapshotResult.rows[0].id

  // Look up current shift's confirmed allocation (created in previous shift targeting current shift) to fill current_nurse
  const currentShiftResult = await client.query(
    `
    select ar.id as run_id
    from allocation_runs ar
    where ar.target_shift_id = $1 and ar.status = 'confirmed'
    order by ar.confirmed_at desc nulls last, ar.suggested_at desc
    limit 1
    `,
    [shiftId],
  )
  const currentRunId = currentShiftResult.rows[0]?.run_id ?? null
  const currentNurseMap = new Map()
  if (currentRunId) {
    const currentItems = await client.query(
      `
      select ai.admission_id, n.short_name
      from allocation_items ai
      join nurses n on n.id = ai.nurse_id
      where ai.allocation_run_id = $1
      `,
      [currentRunId],
    )
    for (const row of currentItems.rows) currentNurseMap.set(row.admission_id, row.short_name)
  }

  let sortOrder = 0
  for (const nurseRow of run.byNurse) {
    for (const patient of nurseRow.patients) {
      const admission = admissions.find((item) => item.admissionId === patient.admissionId)
      if (!admission) continue
      sortOrder += 1
      const burden = burdenByAdmission.get(patient.admissionId)
      const objectiveScore = burden ? Number(burden.score.objectiveTotal) : patient.score
      const subjectiveScore = burden ? Number(burden.score.subjectiveTotal) : 0
      await client.query(
        `
        insert into handoff_rows (
          snapshot_id, admission_id, sort_order,
          bed_label, patient_name, diagnosis, sex, age, admitted_at, attending_physician,
          current_nurse, next_nurse, burden_score, objective_score, subjective_score, handoff_diagnosis, burden_detail
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        `,
        [
          snapshotId,
          admission.admissionId,
          sortOrder,
          admission.bedLabel,
          admission.patientName,
          admission.diagnosis,
          admission.sex,
          admission.age,
          admission.admittedAt,
          admission.attendingPhysician,
          currentNurseMap.get(patient.admissionId) ?? '—',
          nurseRow.shortName,
          patient.score,
          objectiveScore,
          subjectiveScore,
          admission.diagnosis,
          burdenDetailText(burden),
        ],
      )
    }
  }

  return snapshotId
}

function buildNurseBlocks(run) {
  return run.byNurse.map((nurseRow) => ({
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
}

function allocationSignatureFromBlocks(value) {
  const blocks = parseNurseBlocks(value)
  const pairs = []
  for (const block of blocks) {
    for (const bed of block.beds) {
      pairs.push(`${bed.admissionId}:${block.nurseId}`)
    }
  }
  pairs.sort()
  return pairs.join('|')
}

function formatHandoffSnapshotListItem(row) {
  return {
    id: row.id,
    allocationRunId: row.allocation_run_id,
    shiftId: row.shift_id,
    shiftKey: row.shift_key,
    shiftLabel: shiftLabel(row),
    createdAt: row.created_at,
    createdBy: row.created_by_name ?? '小組長',
    allocationSignature: allocationSignatureFromBlocks(row.nurse_blocks),
    summary: {
      patientCount: row.patient_count,
      nurseCount: row.nurse_count,
      statTotal: row.stat_total,
      avgLoad: Number(row.avg_load),
      maxLoad: row.max_load,
    },
  }
}

function formatHandoffRowFromDb(row) {
  return {
    admissionId: row.admission_id,
    bedLabel: row.bed_label,
    patientName: row.patient_name,
    diagnosis: row.diagnosis,
    sex: row.sex,
    age: Number(row.age),
    admittedAt: row.admitted_at,
    attendingPhysician: row.attending_physician,
    currentNurse: row.current_nurse,
    nextNurse: row.next_nurse,
    burdenScore: Number(row.burden_score),
    objectiveScore: Number(row.objective_score ?? 0),
    subjectiveScore: Number(row.subjective_score ?? 0),
    handoffDiagnosis: row.handoff_diagnosis,
    burdenDetail: row.burden_detail,
  }
}

function parseNurseBlocks(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return []
}

const SUBJECTIVE_DETAIL_LABELS = {
  rassScore: 'RASS',
  agitatedFallRisk: '下床風險',
  agitatedTubeRemovalRisk: '拔管風險',
  drainageTube: '引流管',
  tubeFeeding: '管灌',
  dressingChangeFrequency: '換藥頻繁',
  vitalMonitoringFrequency: '監測頻繁',
}

function burdenDetailText(assessment) {
  if (!assessment) return '—'
  const lines = []
  const objectiveLabels = new Map(objectiveFactorDefinitions.map((factor) => [factor.code, factor.label]))
  for (const [key, raw] of Object.entries(assessment.objective ?? {})) {
    const points = Number(raw ?? 0)
    if (points <= 0) continue
    lines.push(`${objectiveLabels.get(key) ?? key} ${points}`)
  }
  const subjective = assessment.subjective
  if (subjective) {
    if (subjective.rassScore != null) lines.push(`${SUBJECTIVE_DETAIL_LABELS.rassScore} ${subjective.rassScore}`)
    if (subjective.agitatedFallRisk) lines.push(`${SUBJECTIVE_DETAIL_LABELS.agitatedFallRisk} 是`)
    if (subjective.agitatedTubeRemovalRisk) lines.push(`${SUBJECTIVE_DETAIL_LABELS.agitatedTubeRemovalRisk} 是`)
    if (subjective.drainageTube) lines.push(`${SUBJECTIVE_DETAIL_LABELS.drainageTube} 是`)
    if (subjective.tubeFeeding) lines.push(`${SUBJECTIVE_DETAIL_LABELS.tubeFeeding} 是`)
    if (Number(subjective.dressingChangeFrequency) > 0) {
      lines.push(`${SUBJECTIVE_DETAIL_LABELS.dressingChangeFrequency} ${levelDetailLabel(subjective.dressingChangeFrequency)}`)
    }
    if (Number(subjective.vitalMonitoringFrequency) > 0) {
      lines.push(`${SUBJECTIVE_DETAIL_LABELS.vitalMonitoringFrequency} ${levelDetailLabel(subjective.vitalMonitoringFrequency)}`)
    }
  }
  if (lines.length === 0) {
    return `客觀 ${assessment.score.objectiveTotal} · 主觀 ${assessment.score.subjectiveTotal}`
  }
  return lines.slice(0, 5).join(' · ')
}

function levelDetailLabel(value) {
  const level = Number(value)
  if (level >= 2) return '高'
  if (level >= 1) return '中'
  return '低'
}

function bedNo(label) {
  const match = label.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

// 依實體病房繞行順序定義（環狀）：下排→左側→上排→右側→回起點
const BED_WALK_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]

function walkDist(labelA, labelB) {
  const a = bedNo(labelA)
  const b = bedNo(labelB)
  const i = BED_WALK_ORDER.indexOf(a)
  const j = BED_WALK_ORDER.indexOf(b)
  if (i === -1 || j === -1) return Math.abs(a - b)
  const n = BED_WALK_ORDER.length
  const diff = Math.abs(i - j)
  return Math.min(diff, n - diff)
}

function maxPairWalkDist(labels) {
  let max = 0
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      max = Math.max(max, walkDist(labels[i], labels[j]))
    }
  }
  return max
}

const DEMO_TEMPLATES = [
  { admissionBedNo: 1, title: 'ABG STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 1, title: 'Lactate STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 1, title: 'Blood cultures x2 STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 1, title: 'Bedside echo STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 1, title: 'NS 250 mL IV bolus STAT', kind: '給藥', orderedBy: '彭OO醫師' },
  { admissionBedNo: 2, title: 'ECG STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 2, title: 'Troponin-I STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 3, title: 'ABG STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 3, title: 'Portable CXR STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 3, title: 'Lactate STAT', kind: '檢查', orderedBy: '彭OO醫師' },
  { admissionBedNo: 3, title: 'Propofol 10mL IV STAT', kind: '給藥', orderedBy: '彭OO醫師' },
  { admissionBedNo: 6, title: 'Bedside echo STAT', kind: '檢查', orderedBy: '胡OO醫師' },
  { admissionBedNo: 8, title: 'Furosemide 1amp IV STAT', kind: '給藥', orderedBy: '胡OO醫師' },
  { admissionBedNo: 9, title: 'CBC STAT', kind: '檢查', orderedBy: '胡OO醫師' },
  { admissionBedNo: 9, title: 'check blood type STAT', kind: '檢查', orderedBy: '胡OO醫師' },
  { admissionBedNo: 9, title: 'Pantoprazole 1vial IV STAT', kind: '給藥', orderedBy: '胡OO醫師' },
  { admissionBedNo: 9, title: 'Lorazepam 0.5 mg PO STAT', kind: '給藥', orderedBy: '胡OO醫師' },
  { admissionBedNo: 12, title: 'Serum Na/osmolality STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 12, title: 'Urine osmolality STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 12, title: 'Urine specific gravity STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 12, title: 'DDAVP PO STAT', kind: '給藥', orderedBy: '李OO醫師' },
  { admissionBedNo: 13, title: 'Ammonia STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 13, title: 'PT/INR STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 13, title: '會診肝臟科', kind: '其他', orderedBy: '李OO醫師' },
  { admissionBedNo: 13, title: '召開家庭會議', kind: '其他', orderedBy: '李OO醫師' },
  { admissionBedNo: 15, title: 'Serum ketone STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'check CBC', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'check U/A', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'check U/C', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'Blood cultures x2 STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'Sputum culture STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'Portable CXR STAT', kind: '檢查', orderedBy: '李OO醫師' },
  { admissionBedNo: 17, title: 'ACT 1 tab PO', kind: '給藥', orderedBy: '李OO醫師' }
]

export async function importDemoStatOrders({ shiftId }) {
  const admissionsResult = await query(
    `
    select a.id as admission_id, b.bed_no
    from admissions a
    join beds b on b.id = a.bed_id
    where a.status = 'active'
    `
  )
  const bedToAdmission = new Map(admissionsResult.rows.map(r => [Number(r.bed_no), r.admission_id]))

  const now = new Date()
  const orderedAtDisplay = new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' }).format(now)

  const inserted = []
  
  await query(`delete from stat_orders where shift_id = $1`, [shiftId])

  for (const t of DEMO_TEMPLATES) {
    const admissionId = bedToAdmission.get(t.admissionBedNo)
    if (admissionId) {
      const result = await query(
        `
        insert into stat_orders (shift_id, admission_id, title, kind, ordered_by, ordered_at_display)
        values ($1, $2, $3, $4, $5, $6)
        returning id, admission_id, title, kind, ordered_by, ordered_at_display, status
        `,
        [shiftId, admissionId, t.title, t.kind, t.orderedBy, orderedAtDisplay]
      )
      inserted.push(result.rows[0])
    }
  }

  return inserted
}

export async function importRoster({ startDate, schedule }) {
  const parsedStartDate = new Date(startDate);
  
  const dayOffsets = {
    '第一天': 0, '第二天': 1, '第三天': 2, '第四天': 3,
    '第五天': 4, '第六天': 5, '第七天': 6
  };
  
  const shiftKeys = {
    '白班': 'day',
    '小夜班': 'evening',
    '大夜班': 'night'
  };

  const seniorityMapping = {
    '15年以上': '15年以上',
    '10-15年': '10-15年',
    '4-10年': '4-10年',
    '1-4年': '1-4年',
    '1-4年以下': '1-4年',
    '1年以下': '1年以下'
  };

  const results = [];

  await withTransaction(async (client) => {
    async function upsertNurse(name, rawSeniority) {
      const cleanName = name.trim();
      const existing = await client.query('select id from nurses where short_name = $1', [cleanName]);
      if (existing.rows[0]) {
        return existing.rows[0].id;
      }
      const userId = randomUUID();
      const employeeNo = `TEMP_N_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      const seniorityLevel = seniorityMapping[rawSeniority] || '4-10年';
      
      await client.query(
        `insert into users (id, name, role, employee_no) values ($1, $2, 'nurse', $3)`,
        [userId, cleanName, employeeNo]
      );
      await client.query(
        `insert into nurses (id, display_name, short_name, seniority_level, is_active) values ($1, $2, $2, $3, true)`,
        [userId, cleanName, seniorityLevel]
      );
      return userId;
    }

    for (const item of schedule) {
      const offset = dayOffsets[item.day];
      if (offset === undefined) continue;

      const shiftKey = shiftKeys[item.shift];
      if (!shiftKey) continue;

      const date = new Date(parsedStartDate);
      date.setDate(date.getDate() + offset);
      const dateStr = date.toISOString().split('T')[0];

      let startsAtStr, endsAtStr;
      if (shiftKey === 'day') {
        startsAtStr = `${dateStr}T07:00:00+08:00`;
        endsAtStr = `${dateStr}T15:00:00+08:00`;
      } else if (shiftKey === 'evening') {
        startsAtStr = `${dateStr}T15:00:00+08:00`;
        endsAtStr = `${dateStr}T23:00:00+08:00`;
      } else {
        startsAtStr = `${dateStr}T23:00:00+08:00`;
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];
        endsAtStr = `${nextDateStr}T07:00:00+08:00`;
      }

      const startsAt = new Date(startsAtStr);
      const endsAt = new Date(endsAtStr);

      let shiftId;
      const existingShift = await client.query(
        `select id, status from shifts where unit_name = 'ICU' and starts_at = $1 and ends_at = $2`,
        [startsAt, endsAt]
      );

      let status = 'confirmed';
      if (existingShift.rows[0]) {
        shiftId = existingShift.rows[0].id;
        status = existingShift.rows[0].status;
        await client.query(`delete from shift_nurses where shift_id = $1`, [shiftId]);
      } else {
        shiftId = randomUUID();
        await client.query(
          `insert into shifts (id, unit_name, shift_key, starts_at, ends_at, status) values ($1, 'ICU', $2, $3, $4, $5)`,
          [shiftId, shiftKey, startsAt, endsAt, status]
        );
      }

      const nursesWithInfo = [];
      for (const [seniorityCat, nurseNames] of Object.entries(item.nurses)) {
        if (!nurseNames || !Array.isArray(nurseNames)) continue;
        for (const name of nurseNames) {
          const nurseId = await upsertNurse(name, seniorityCat);
          const userResult = await client.query('select role from users where id = $1', [nurseId]);
          const userRole = userResult.rows[0]?.role ?? 'nurse';
          
          nursesWithInfo.push({
            id: nurseId,
            name,
            seniority: seniorityCat,
            dbRole: userRole
          });
        }
      }

      let chargeNurse = nursesWithInfo.find(n => n.dbRole === 'charge_nurse');
      if (!chargeNurse) {
        const priority = ['15年以上', '10-15年', '4-10年', '1-4年', '1年以下'];
        for (const p of priority) {
          const matched = nursesWithInfo.filter(n => p.includes(n.seniority) || n.seniority.includes(p));
          if (matched.length > 0) {
            chargeNurse = matched[0];
            break;
          }
        }
      }
      if (!chargeNurse && nursesWithInfo.length > 0) {
        chargeNurse = nursesWithInfo[0];
      }

      const chargeNurseId = chargeNurse ? chargeNurse.id : null;

      await client.query(
        `update shifts set charge_nurse_id = $1 where id = $2`,
        [chargeNurseId, shiftId]
      );

      for (const nurse of nursesWithInfo) {
        const isCharge = nurse.id === chargeNurseId;
        await client.query(
          `insert into shift_nurses (shift_id, nurse_id, role) values ($1, $2, $3)
           on conflict (shift_id, nurse_id) do update set role = $3`,
          [shiftId, nurse.id, isCharge ? 'charge_nurse' : 'nurse']
        );
      }

      results.push({
        shiftId,
        date: dateStr,
        shiftKey,
        nurseCount: nursesWithInfo.length,
        chargeNurseName: chargeNurse ? chargeNurse.name : '—'
      });
    }
  });

  return results;
}
