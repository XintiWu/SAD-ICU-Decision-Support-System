import { admissions } from './step1Data.mjs'
import { ApiError, getCurrentUser, listAdmissions } from './step1Repository.mjs'
import {
  burdenAssessments,
  objectiveFactorDefinitions,
  subjectiveFactorDefinitions,
  tasks,
} from './step2Data.mjs'

const taskKinds = ['給藥', '檢查', '監測', '家屬', '紀錄']

export function listBurdenAssessments({ shiftId, scope = 'all', userId } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  const currentUser = getCurrentUser(userId)
  const admissionMap = new Map(listAdmissions({ shiftId, status: 'active' }).map((admission) => [admission.admissionId, admission]))

  return burdenAssessments
    .filter((assessment) => assessment.shiftId === shiftId)
    .filter((assessment) => scope !== 'mine' || assessment.submittedBy === currentUser.id)
    .map((assessment) => formatAssessment(assessment, admissionMap.get(assessment.admissionId)))
    .sort((a, b) => bedNo(a.bedLabel) - bedNo(b.bedLabel))
}

export function updateBurdenAssessment({ assessmentId, patch, userId } = {}) {
  const assessment = burdenAssessments.find((item) => item.id === assessmentId)
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', '找不到麻煩度評估', { assessmentId })

  const currentUser = getCurrentUser(userId)
  if (assessment.submittedBy && assessment.submittedBy !== currentUser.id) {
    throw new ApiError(403, 'FORBIDDEN', '只能更新自己負責的病患評估', { assessmentId })
  }

  if (patch.subjective) {
    assessment.subjective = normalizeSubjective({ ...(assessment.subjective ?? defaultSubjective()), ...patch.subjective })
  }

  if (patch.status !== undefined) {
    if (!['draft', 'submitted'].includes(patch.status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status: patch.status })
    }
    assessment.status = patch.status
    assessment.submittedAt = patch.status === 'submitted' ? new Date().toISOString() : null
  }

  assessment.submittedBy = currentUser.id
  assessment.updatedAt = new Date().toISOString()

  const admissionMap = new Map(listAdmissions({ shiftId: assessment.shiftId, status: 'active' }).map((admission) => [admission.admissionId, admission]))
  return formatAssessment(assessment, admissionMap.get(assessment.admissionId))
}

export function listTasks({ shiftId, assignee = 'me', status, kind, userId } = {}) {
  if (!shiftId) throw new ApiError(400, 'VALIDATION_ERROR', 'shiftId 為必填', { field: 'shiftId' })
  if (status && !['pending', 'done', 'cancelled'].includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status })
  }
  if (kind && !taskKinds.includes(kind)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'kind 參數不合法', { kind })
  }

  const currentUser = getCurrentUser(userId)
  const rows = tasks
    .filter((task) => task.shiftId === shiftId)
    .filter((task) => assignee !== 'me' || task.assignedNurseId === currentUser.id)
    .filter((task) => !status || task.status === status)
    .filter((task) => !kind || task.kind === kind)
    .map(formatTask)
    .sort(taskSort)

  const allForScope = tasks
    .filter((task) => task.shiftId === shiftId)
    .filter((task) => assignee !== 'me' || task.assignedNurseId === currentUser.id)

  return {
    data: rows,
    meta: {
      counts: {
        total: allForScope.length,
        pending: allForScope.filter((task) => task.status === 'pending').length,
        done: allForScope.filter((task) => task.status === 'done').length,
      },
      remainingPoints: allForScope
        .filter((task) => task.status === 'pending')
        .reduce((sum, task) => sum + taskPoints(task), 0),
    },
  }
}

export function updateTask({ taskId, patch, userId } = {}) {
  const task = tasks.find((item) => item.id === taskId)
  if (!task) throw new ApiError(404, 'TASK_NOT_FOUND', '找不到任務', { taskId })

  const currentUser = getCurrentUser(userId)
  if (task.assignedNurseId !== currentUser.id) {
    throw new ApiError(403, 'FORBIDDEN', '只能更新自己的任務', { taskId })
  }

  if (patch.status !== undefined) {
    if (!['pending', 'done', 'cancelled'].includes(patch.status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'status 參數不合法', { status: patch.status })
    }
    task.status = patch.status
    task.completedAt = patch.status === 'done' ? new Date().toISOString() : null
    task.completedBy = patch.status === 'done' ? currentUser.id : null
  }

  return formatTask(task)
}

function formatAssessment(assessment, admission) {
  if (!admission) throw new ApiError(500, 'DATA_INTEGRITY_ERROR', '評估資料缺少入院資料', { assessmentId: assessment.id })
  const subjective = assessment.subjective ?? defaultSubjective()
  const objectiveTotalValue = objectiveTotal(assessment.objective)
  const subjectiveTotalValue = subjectiveTotal(subjective)
  const totalScore = objectiveTotalValue + subjectiveTotalValue

  return {
    assessmentId: assessment.id,
    admissionId: assessment.admissionId,
    bedLabel: admission.bedLabel,
    diagnosis: admission.diagnosis,
    objective: assessment.objective,
    subjective: assessment.subjective,
    score: {
      objectiveTotal: objectiveTotalValue,
      subjectiveTotal: subjectiveTotalValue,
      totalScore,
      level: burdenLevel(totalScore),
    },
    status: assessment.status,
    submittedAt: assessment.submittedAt,
    updatedAt: assessment.updatedAt,
  }
}

function formatTask(task) {
  const admission = admissions.find((item) => item.id === task.admissionId)
  const admissionView = listAdmissions({ shiftId: task.shiftId, status: 'active' }).find((item) => item.admissionId === task.admissionId)
  if (!admission || !admissionView) throw new ApiError(500, 'DATA_INTEGRITY_ERROR', '任務資料缺少入院資料', { taskId: task.id })

  return {
    id: task.id,
    admissionId: task.admissionId,
    bedLabel: `${admissionView.bedLabel} - ${admissionView.diagnosis}`,
    title: task.title,
    kind: task.kind,
    urgent: task.urgent,
    status: task.status,
    done: task.status === 'done',
    completedAt: task.completedAt ?? null,
    points: taskPoints(task),
    source: task.source,
  }
}

function normalizeSubjective(input) {
  const out = defaultSubjective()
  for (const factor of subjectiveFactorDefinitions) {
    const value = input[factor.code]
    if (factor.valueType === 'boolean') out[factor.code] = Boolean(value)
    if (factor.valueType === 'level') {
      if (![0, 1, 2].includes(value)) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${factor.code} 必須是 0、1 或 2`, { field: factor.code })
      }
      out[factor.code] = value
    }
    if (factor.valueType === 'number') {
      if (value !== null && value !== undefined && !Number.isFinite(Number(value))) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${factor.code} 必須是數字或 null`, { field: factor.code })
      }
      out[factor.code] = value === null || value === undefined ? null : Math.trunc(Number(value))
    }
  }
  return out
}

function defaultSubjective() {
  return {
    rassScore: null,
    agitatedFallRisk: false,
    agitatedTubeRemovalRisk: false,
    drainageTube: false,
    tubeFeeding: false,
    dressingChangeFrequency: 0,
    vitalMonitoringFrequency: 0,
  }
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
    subjective.dressingChangeFrequency +
    subjective.vitalMonitoringFrequency
  )
}

function rassPoints(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0
  const abs = Math.abs(Number(value))
  if (abs <= 1) return 0
  if (abs <= 3) return 1
  return 2
}

function burdenLevel(totalScore) {
  if (totalScore >= 22) return '高'
  if (totalScore >= 14) return '中'
  return '低'
}

function taskPoints(task) {
  const base = task.kind === '給藥' ? 3 : task.kind === '檢查' || task.kind === '監測' ? 2 : 1
  return base + (task.urgent ? 2 : 0)
}

function taskSort(a, b) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done)
  if (a.urgent !== b.urgent) return Number(b.urgent) - Number(a.urgent)
  return bedNo(a.bedLabel) - bedNo(b.bedLabel)
}

function bedNo(label) {
  const match = label.match(/\d+/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}
