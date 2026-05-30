/** 開發時走 Vite proxy（/api/v1 → 8787），避免跨域；也可設 VITE_API_BASE_URL 覆寫 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/** 後端無法連線時的預設班別（與 seed / demo 一致） */
export const CURRENT_SHIFT_ID = '00000000-0000-0000-0000-000000000201'

/** demo 小組長（charge_nurse），呼叫分床 API 時帶入 */
export const CHARGE_USER_ID = '00000000-0000-0000-0000-000000000110'

export type ApiNurse = {
  id: string
  displayName: string
  shortName: string
  role: string
  seniorityLevel: string | null
  isActive: boolean
}

export type ApiShift = {
  id: string
  shiftKey: 'day' | 'evening' | 'night'
  label: string
  startsAt: string
  endsAt: string
  status: string
  chargeNurse: { id: string; shortName: string } | null
}

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
  allocationRunId: string | null
  shiftId: string
  targetShiftId: string | null
  status: 'draft' | 'confirmed' | 'cancelled' | 'none'
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

export async function apiGet<T>(path: string, opts?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, opts)
}

export async function apiPost<T>(path: string, body: unknown, opts?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...opts, method: 'POST', body })
}

export async function apiPut<T>(path: string, body: unknown, opts?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...opts, method: 'PUT', body })
}

export async function apiPatch<T>(path: string, body: unknown, opts?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, { ...opts, method: 'PATCH', body })
}

type ApiRequestOptions = {
  method?: string
  body?: unknown
  userId?: string
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.userId) headers['X-User-Id'] = options.userId

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: Object.keys(headers).length ? headers : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
