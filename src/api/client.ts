/** 開發時走 Vite proxy（/api/v1 → 8787），避免跨域；也可設 VITE_API_BASE_URL 覆寫 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

/** 後端無法連線時的預設班別（與 seed / demo 一致） */
export const CURRENT_SHIFT_ID = '00000000-0000-0000-0000-000000000202'

/** demo 護理師（nurse），一般 API 預設使用者 */
export const CURRENT_NURSE_USER_ID = '00000000-0000-0000-0000-000000000101'

/** demo 小組長（charge_nurse），呼叫分床 API 時帶入 */
export const CHARGE_USER_ID = '00000000-0000-0000-0000-000000000110'

export type ApiUser = {
  id: string
  name: string
  displayName: string
  shortName: string
  role: string
  currentShiftId: string
}

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
  bedDetail?: string
  title: string
  kind: '給藥' | '檢查' | '監測' | '家屬' | '紀錄'
  urgent: boolean
  status: 'pending' | 'done' | 'cancelled'
  done: boolean
  completedAt: string | null
  createdAt?: string
  points: number
  source: string
  assignedNurseId?: string
}

export type ApiStatOrder = {
  id: string
  admissionId: string
  bedLabel: string
  diagnosis: string
  title: string
  kind: '給藥' | '檢查' | '監測' | '治療' | '其他'
  orderedBy: string
  orderedAt: string
  reason?: string
  status: 'pending' | 'done' | 'cancelled'
}

export type HandoffSnapshotListItem = {
  id: string
  allocationRunId: string
  shiftId: string
  shiftKey: string
  shiftLabel: string
  createdAt: string
  createdBy: string
  allocationSignature: string
  summary: {
    patientCount: number
    nurseCount: number
    statTotal: number
    avgLoad: number
    maxLoad: number
  }
}

export type HandoffSnapshotDetail = HandoffSnapshotListItem & {
  allocation: {
    unassignedCount: number
    stats: AllocationRun['stats']
  }
  nurseBlocks: Array<{
    nurseId: string
    nurseName: string
    load: number
    beds: Array<{
      admissionId: string
      bedLabel: string
      label: string
      score: number
      tone: 'high' | 'mid' | 'low'
    }>
  }>
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

export type DecisionCandidate = {
  nurseId: string
  displayName: string
  shortName: string
  currentLoad: number
  seniorityLevel: string
  seniorityRank: number
  hasNearbyBed: boolean
}

export type DecisionLog = {
  admissionId: string
  bedLabel: string
  patientName: string
  score: number
  isHighBurden: boolean
  minLoad: number
  candidates: DecisionCandidate[]
  chosenNurseId: string
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
  decisionLogs?: DecisionLog[] | null
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
  snapshotId: string | null
  allocationRunId: string | null
  createdAt: string | null
  rows: Array<ApiAdmission & {
    currentNurse: string
    nextNurse: string
    burdenScore: number
    handoffDiagnosis: string
    burdenDetail: string
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

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: Object.keys(headers).length ? headers : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('無法連線後端 API，請確認 backend 是否已啟動（port 8787）')
  }

  const raw = await response.text()
  if (!raw.trim()) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('後端 API 未回應，請在 frontend-v2/backend 執行：node server.mjs')
    }
    throw new Error(`API 回傳空白內容（HTTP ${response.status}）`)
  }

  let payload: { data?: T; error?: { message?: string } }
  try {
    payload = JSON.parse(raw) as typeof payload
  } catch {
    throw new Error(`API 回傳非 JSON 格式（HTTP ${response.status}）`)
  }

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
