import { randomUUID } from 'node:crypto'
import { admissions, ids } from './step1Data.mjs'
import { ApiError, getCurrentUser, listAdmissions, listNurses } from './step1Repository.mjs'
import { burdenAssessments, objectiveFactorDefinitions, subjectiveFactorDefinitions } from './step2Data.mjs'
import { allocationItems, allocationRuns } from './step3Data.mjs'

export function suggestAllocationRun({ shiftId = ids.currentShift, targetShiftId = ids.currentShift, userId } = {}) {
  const user = getCurrentUser(userId ?? ids.chargeNurse)
  if (!['charge_nurse', 'admin'].includes(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', '只有小組長或管理者可以產生分床建議')
  }

  const run = {
    id: randomUUID(),
    shiftId,
    targetShiftId,
    createdBy: user.id,
    status: 'draft',
    algorithmVersion: 'demo-greedy-v1',
    suggestedAt: new Date().toISOString(),
    confirmedAt: null,
  }
  allocationRuns.push(run)

  const nurses = allocatableNurses(shiftId)
  const loads = new Map(nurses.map((nurse) => [nurse.id, 0]))
  const nextItems = []
  const patientScores = admissionsWithScores(shiftId).sort((a, b) => b.score - a.score)

  for (const patient of patientScores) {
    const nurse = [...nurses].sort((a, b) => (loads.get(a.id) ?? 0) - (loads.get(b.id) ?? 0))[0]
    if (!nurse) continue
    const sortOrder = nextItems.filter((item) => item.nurseId === nurse.id).length + 1
    nextItems.push({
      id: randomUUID(),
      allocationRunId: run.id,
      admissionId: patient.admissionId,
      nurseId: nurse.id,
      score: patient.score,
      sortOrder,
      isManualOverride: false,
    })
    loads.set(nurse.id, (loads.get(nurse.id) ?? 0) + patient.score)
  }

  allocationItems.push(...nextItems)
  return formatAllocationRun(run.id)
}

export function getAllocationRun({ allocationRunId } = {}) {
  return formatAllocationRun(allocationRunId)
}

export function updateAllocationItems({ allocationRunId, items, userId } = {}) {
  const run = ensureRun(allocationRunId)
  ensureEditableRun(run)
  const user = getCurrentUser(userId ?? ids.chargeNurse)
  if (!['charge_nurse', 'admin'].includes(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', '只有小組長或管理者可以調整分床')
  }
  if (!Array.isArray(items)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'items 必須是陣列', { field: 'items' })
  }

  const admissionsById = new Set(listAdmissions({ shiftId: run.shiftId, status: 'active' }).map((admission) => admission.admissionId))
  const nursesById = new Set(allocatableNurses(run.shiftId).map((nurse) => nurse.id))
  const seenAdmissions = new Set()

  const nextItems = items.map((item, index) => {
    if (!admissionsById.has(item.admissionId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'admissionId 不屬於此班別', { admissionId: item.admissionId })
    }
    if (!nursesById.has(item.nurseId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'nurseId 不屬於此班別可分配護理師', { nurseId: item.nurseId })
    }
    if (seenAdmissions.has(item.admissionId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', '同一位病患不可重複分配', { admissionId: item.admissionId })
    }
    seenAdmissions.add(item.admissionId)

    return {
      id: randomUUID(),
      allocationRunId: run.id,
      admissionId: item.admissionId,
      nurseId: item.nurseId,
      score: scoreForAdmission(item.admissionId),
      sortOrder: Number.isInteger(item.sortOrder) ? item.sortOrder : index + 1,
      isManualOverride: Boolean(item.isManualOverride ?? true),
    }
  })

  for (let index = allocationItems.length - 1; index >= 0; index -= 1) {
    if (allocationItems[index].allocationRunId === run.id) allocationItems.splice(index, 1)
  }
  allocationItems.push(...nextItems)

  return formatAllocationRun(run.id)
}

export function confirmAllocationRun({ allocationRunId, userId } = {}) {
  const run = ensureRun(allocationRunId)
  ensureEditableRun(run)
  const user = getCurrentUser(userId ?? ids.chargeNurse)
  if (!['charge_nurse', 'admin'].includes(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', '只有小組長或管理者可以確認分床')
  }

  const activeAdmissions = listAdmissions({ shiftId: run.shiftId, status: 'active' })
  const assignedIds = new Set(allocationItems.filter((item) => item.allocationRunId === run.id).map((item) => item.admissionId))
  const unassigned = activeAdmissions.filter((admission) => !assignedIds.has(admission.admissionId))
  if (unassigned.length > 0) {
    throw new ApiError(409, 'ALLOCATION_INCOMPLETE', '仍有病患尚未分配', {
      unassigned: unassigned.map((admission) => admission.admissionId),
    })
  }

  run.status = 'confirmed'
  run.confirmedAt = new Date().toISOString()
  return formatAllocationRun(run.id)
}

function formatAllocationRun(allocationRunId) {
  const run = ensureRun(allocationRunId)
  const activeAdmissions = listAdmissions({ shiftId: run.shiftId, status: 'active' })
  const admissionMap = new Map(activeAdmissions.map((admission) => [admission.admissionId, admission]))
  const items = allocationItems.filter((item) => item.allocationRunId === run.id)
  const assignedAdmissionIds = new Set(items.map((item) => item.admissionId))
  const nurseRows = allocatableNurses(run.shiftId).map((nurse) => {
    const nurseItems = items
      .filter((item) => item.nurseId === nurse.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const patients = nurseItems.map((item) =>
      patientCard(
        admissionMap.get(item.admissionId),
        item.score > 0 ? item.score : scoreForAdmission(item.admissionId),
        item.isManualOverride,
      ),
    )
    return {
      nurseId: nurse.id,
      shortName: nurse.shortName,
      load: patients.reduce((sum, patient) => sum + patient.score, 0),
      patients,
    }
  })
  const unassigned = activeAdmissions
    .filter((admission) => !assignedAdmissionIds.has(admission.admissionId))
    .map((admission) => patientCard(admission, scoreForAdmission(admission.admissionId), false))
  const loads = nurseRows.map((row) => row.load)

  return {
    allocationRunId: run.id,
    shiftId: run.shiftId,
    targetShiftId: run.targetShiftId,
    status: run.status,
    algorithmVersion: run.algorithmVersion,
    suggestedAt: run.suggestedAt,
    confirmedAt: run.confirmedAt,
    unassigned,
    byNurse: nurseRows,
    stats: {
      totalBeds: activeAdmissions.length,
      totalNurses: nurseRows.length,
      averageLoad: loads.length ? Math.round((loads.reduce((sum, load) => sum + load, 0) / loads.length) * 10) / 10 : 0,
      maxLoad: loads.length ? Math.max(...loads) : 0,
    },
  }
}

function patientCard(admission, score, isManualOverride) {
  if (!admission) throw new ApiError(500, 'DATA_INTEGRITY_ERROR', '分床項目缺少入院資料')
  return {
    admissionId: admission.admissionId,
    bedLabel: admission.bedLabel,
    diagnosis: admission.diagnosis,
    score,
    tone: score >= 22 ? 'high' : score >= 14 ? 'mid' : 'low',
    isManualOverride,
  }
}

function allocatableNurses(shiftId) {
  return listNurses({ shiftId }).filter((nurse) => nurse.role === 'nurse' && nurse.isActive)
}

function admissionsWithScores(shiftId) {
  return listAdmissions({ shiftId, status: 'active' }).map((admission) => ({
    ...admission,
    score: scoreForAdmission(admission.admissionId),
  }))
}

function scoreForAdmission(admissionId) {
  const assessment = burdenAssessments.find((item) => item.admissionId === admissionId)
  if (!assessment) return 0
  return objectiveTotal(assessment.objective) + subjectiveTotal(assessment.subjective ?? defaultSubjective())
}

function objectiveTotal(objective) {
  return objectiveFactorDefinitions.reduce((sum, factor) => sum + Number(objective[factor.code] ?? 0), 0)
}

function subjectiveTotal(subjective) {
  const yes = (value) => (value ? 2 : 0)
  return (
    rassPoints(subjective.rassScore) +
    yes(subjective.agitatedFallRisk) +
    yes(subjective.agitatedTubeRemovalRisk) +
    yes(subjective.drainageTube) +
    yes(subjective.tubeFeeding) +
    Number(subjective.dressingChangeFrequency ?? 0) +
    Number(subjective.vitalMonitoringFrequency ?? 0)
  )
}

function rassPoints(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0
  const abs = Math.abs(Number(value))
  if (abs <= 1) return 0
  if (abs <= 3) return 1
  return 2
}

function defaultSubjective() {
  return Object.fromEntries(subjectiveFactorDefinitions.map((factor) => [factor.code, factor.valueType === 'boolean' ? false : 0]))
}

function ensureRun(allocationRunId) {
  const run = allocationRuns.find((item) => item.id === allocationRunId)
  if (!run) throw new ApiError(404, 'ALLOCATION_RUN_NOT_FOUND', '找不到分床執行紀錄', { allocationRunId })
  return run
}

function ensureEditableRun(run) {
  if (run.status !== 'draft') {
    throw new ApiError(409, 'ALLOCATION_RUN_LOCKED', '已確認或取消的分床不可修改', { allocationRunId: run.id, status: run.status })
  }
}
