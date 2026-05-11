const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787/api/v1'

export const CURRENT_SHIFT_ID = '00000000-0000-0000-0000-000000000201'

export type ApiAdmission = {
  admissionId: string
  patientId: string
  bedId: string
  bedLabel: string
  patientName: string
  diagnosis: string
  sex: '男' | '女'
  age: number
  admittedAt: string
  attendingPhysician: string
}

export type BurdenAssessment = {
  assessmentId: string
  admissionId: string
  bedLabel: string
  diagnosis: string
  objective: Record<string, number>
  subjective: SubjectivePayload | null
  score: {
    objectiveTotal: number
    subjectiveTotal: number
    totalScore: number
    level: '高' | '中' | '低'
  }
  status: 'draft' | 'submitted'
}

export type SubjectivePayload = {
  rassScore: number | null
  agitatedFallRisk: boolean
  agitatedTubeRemovalRisk: boolean
  drainageTube: boolean
  tubeFeeding: boolean
  dressingChangeFrequency: 0 | 1 | 2
  vitalMonitoringFrequency: 0 | 1 | 2
}

export type ApiTask = {
  id: string
  admissionId: string
  bedLabel: string
  title: string
  kind: '給藥' | '檢查' | '監測' | '家屬' | '紀錄'
  urgent: boolean
  status: 'pending' | 'done' | 'cancelled'
  done: boolean
  completedAt: string | null
  points: number
  source: string
}

export type AllocationPatient = {
  admissionId: string
  bedLabel: string
  patientName: string
  diagnosis: string
  score: number
  tone: 'high' | 'mid' | 'low'
  isManualOverride: boolean
}

export type AllocationRun = {
  allocationRunId: string
  shiftId: string
  targetShiftId: string
  status: 'draft' | 'confirmed' | 'cancelled'
  suggestedAt: string
  confirmedAt: string | null
  unassigned: AllocationPatient[]
  byNurse: Array<{
    nurseId: string
    shortName: string
    load: number
    patients: AllocationPatient[]
  }>
  stats: {
    totalBeds: number
    totalNurses: number
    averageLoad: number
    maxLoad: number
  }
}

export type WarRoomData = {
  overview: {
    nurseCount: number
    totalTasks: number
    doneTasks: number
    pendingTasks: number
    urgentOpenTasks: number
  }
  nurses: Array<{
    nurseId: string
    shortName: string
    load: number
    remaining: number
    patients: AllocationPatient[]
    tasks: ApiTask[]
  }>
}

export type HandoffData = {
  rows: Array<ApiAdmission & {
    currentNurse: string
    nextNurse: string
    burdenScore: number
    handoffDiagnosis: string
  }>
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body })
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body })
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body })
}

async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'content-type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const payload = await response.json()
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? `API request failed: ${response.status}`)
  }
  return payload.data as T
}

export function defaultSubjective(): SubjectivePayload {
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
