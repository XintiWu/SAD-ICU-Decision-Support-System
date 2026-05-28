import {
  INITIAL_BY_NURSE,
  INITIAL_UNASSIGNED,
  NURSES,
  PATIENTS,
  type NurseId,
  type PatientId,
} from '../data/allocationMock'
import {
  CHARGE_NURSE_NAME,
  SIMULATION_PATIENTS,
  SIMULATION_STAT_ORDERS,
  SIMULATION_TASKS,
  parseBedKey,
} from '../data/patientSimulation'

export type BedId =
  | 'bed1'
  | 'bed2'
  | 'bed3'
  | 'bed4'
  | 'bed5'
  | 'bed6'
  | 'bed7'
  | 'bed8'
  | 'bed9'
  | 'bed10'
  | 'bed11'
  | 'bed12'
  | 'bed13'
  | 'bed14'
  | 'bed15'
  | 'bed16'
  | 'bed17'

export type Sex = '男' | '女'

export type Patient = {
  bedId: BedId
  bedLabel: string
  patientName: string
  diagnosis: string
  sex: Sex
  age: number
  admittedAt: string
  attendingPhysician: string
  objective: ObjectiveFactors
  subjective?: SubjectiveFactors
}

export type ObjectiveFactorKey =
  | '負壓隔離病房'
  | '高呼吸器需求'
  | '藥物種類數'
  | '藥物使用頻率'
  | 'CRRT（持續型 A）'
  | 'IABP（持續型 B）'
  | 'ECMO（持續型 B）'
  | 'PRONE（持續型B）'
  | '低溫治療（持續性 B）'
  | '大量輸血（單次 C）'
  | '跟Plasma（單次C）'

export type ObjectiveFactors = Record<ObjectiveFactorKey, number>

export type SubjectiveLevel = 0 | 1 | 2

export type SubjectiveFactors = {
  'RASS 鎮靜分數（原始數值）': number | null
  '躁動且有下床風險': boolean
  '躁動且有拔管風險': boolean
  '引流管': boolean
  '需人工管灌': boolean
  '換藥頻繁程度': SubjectiveLevel
  '生理狀態監測頻繁程度': SubjectiveLevel
}

export function objectiveTotal(o: ObjectiveFactors) {
  return Object.values(o).reduce((a, b) => a + b, 0)
}

export function subjectiveTotal(s: SubjectiveFactors) {
  const yes = (v: boolean) => (v ? 2 : 0)
  const rassPoints = (v: number | null) => {
    if (v == null || Number.isNaN(v)) return 0
    const a = Math.abs(v)
    if (a <= 1) return 0
    if (a <= 3) return 1
    return 2
  }

  return (
    rassPoints(s['RASS 鎮靜分數（原始數值）']) +
    yes(s['躁動且有下床風險']) +
    yes(s['躁動且有拔管風險']) +
    yes(s['引流管']) +
    yes(s['需人工管灌']) +
    s['換藥頻繁程度'] +
    s['生理狀態監測頻繁程度']
  )
}

export type TaskKind = '給藥' | '檢查' | '監測' | '家屬' | '紀錄'

export type Task = {
  id: string
  bedLabel: string
  title: string
  kind: TaskKind
  urgent?: boolean
  done?: boolean
  at?: string
}

export type StatOrderKind = '檢查' | '治療' | '給藥' | '監測' | '其他'

export type StatOrder = {
  id: string
  bedLabel: string
  title: string
  kind: StatOrderKind
  orderedAt: string
  orderedBy: string
  reason?: string
}

export type OrderItem = {
  bedLabel: string
  text: string
}

export type ShiftKey = 'day'

const store = {
  lastImportedAt: undefined as string | undefined,
  onDutyCharge: `小組長 ${CHARGE_NURSE_NAME}` as string,
  currentNurseId: 'n1' as NurseId,
  currentShift: 'day' as ShiftKey,
  patients: structuredClone(SIMULATION_PATIENTS),
  tasks: structuredClone(SIMULATION_TASKS),
  statOrders: structuredClone(SIMULATION_STAT_ORDERS),
  allocationUnassigned: [...INITIAL_UNASSIGNED] as PatientId[],
  allocationByNurse: structuredClone(INITIAL_BY_NURSE) as Record<NurseId, PatientId[]>,
}

export function getAllocationByNurse() {
  return store.allocationByNurse
}

export function getAllocationUnassigned() {
  return store.allocationUnassigned
}

export function setAllocationByNurse(next: Record<NurseId, PatientId[]>) {
  store.allocationByNurse = next
}

export function setAllocationUnassigned(next: PatientId[]) {
  store.allocationUnassigned = next
}

export function getDemoPatients() {
  return store.patients
}

export function setDemoPatients(next: Patient[]) {
  store.patients = next
}

export function getDemoTasks() {
  return store.tasks
}

export function setDemoTasks(next: Task[]) {
  store.tasks = next
}

export function taskPoints(t: Task) {
  const base =
    t.kind === '給藥'
      ? 3
      : t.kind === '檢查'
        ? 2
        : t.kind === '監測'
          ? 2
          : t.kind === '家屬'
            ? 1
            : 1
  return base + (t.urgent ? 2 : 0)
}

export function getDemoStatOrders() {
  return store.statOrders
}

export function setDemoStatOrders(next: StatOrder[]) {
  store.statOrders = next
}

export function setLastImportedAt(iso: string) {
  store.lastImportedAt = iso
}

export function getLastImportedAt() {
  return store.lastImportedAt
}

export function getOnDutyCharge() {
  return store.onDutyCharge
}

export function getCurrentShift() {
  return store.currentShift
}

export function getCurrentNurseId() {
  return store.currentNurseId
}

export function getCurrentNurseLabel() {
  return NURSES[store.currentNurseId]?.shortName ?? '—'
}

export function setCurrentNurseId(next: NurseId) {
  store.currentNurseId = next
}

export function getAssignedBedLabelsForCurrentNurse() {
  const ids = store.allocationByNurse[store.currentNurseId] ?? []
  return ids
    .map((pid) => PATIENTS[pid]?.label ?? '')
    .map((label) => parseBedKey(label))
    .filter(Boolean)
}

export function statOrderWeight(o: StatOrder) {
  const base =
    o.kind === '給藥'
      ? 3
      : o.kind === '檢查'
        ? 2
        : o.kind === '治療'
          ? 3
          : o.kind === '監測'
            ? 2
            : 1
  return base + 2
}

export function parseOrders(text: string): OrderItem[] {
  // 輕量原型：每行格式「床 2: Vancomycin q12h」或「床2 Vancomycin q12h」
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const out: OrderItem[] = []
  for (const line of lines) {
    const m =
      line.match(/^(MI-\d+)\s*[:：]?\s*(.+)$/i) ??
      line.match(/^(床\s*\d+)\s*[:：]?\s*(.+)$/) ??
      line.match(/^(bed\s*\d+)\s*[:：]?\s*(.+)$/i)
    if (m) out.push({ bedLabel: normalizeBed(m[1]), text: m[2].trim() })
  }
  return out
}

export function deriveObjectiveAndStatOrders(orders: OrderItem[]) {
  // 原型規則（可替換成你們報告內的正式規則）
  const byBed = new Map<
    string,
    { objective: Partial<ObjectiveFactors>; statOrders: StatOrder[] }
  >()
  const now = nowHHMM()
  const add = (
    bedLabel: string,
    patch: Partial<ObjectiveFactors>,
    order?: Omit<StatOrder, 'id'>,
  ) => {
    const cur = byBed.get(bedLabel) ?? { objective: {}, statOrders: [] as StatOrder[] }
    cur.objective = { ...cur.objective, ...sumPatch(cur.objective, patch) }
    if (order) cur.statOrders.push({ id: cryptoId(), ...order })
    byBed.set(bedLabel, cur)
  }

  for (const o of orders) {
    const t = o.text.toLowerCase()
    if (t.includes('norepinephrine') || t.includes('drip') || t.includes('升壓')) {
      add(
        o.bedLabel,
        { 藥物使用頻率: 2, 藥物種類數: 1 },
        {
          bedLabel: `${o.bedLabel} — (匯入)`,
          title: 'STAT 升壓藥滴速/目標壓確認',
          kind: '給藥',
          orderedAt: now,
          orderedBy: '（匯入醫囑）',
        },
      )
    }
    if (t.includes('vancomycin') || t.includes('antibiotic') || t.includes('抗生素')) {
      add(o.bedLabel, { 藥物使用頻率: 1, 藥物種類數: 1 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: 'STAT 抗生素給藥',
        kind: '給藥',
        orderedAt: now,
        orderedBy: '（匯入醫囑）',
      })
    }
    if (t.includes('cbc') || t.includes('抽血') || t.includes('lab')) {
      add(o.bedLabel, { '大量輸血（單次 C）': 0 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: 'STAT 抽血/檢體送驗',
        kind: '檢查',
        orderedAt: now,
        orderedBy: '（匯入醫囑）',
      })
    }
    if (t.includes('q1h') || t.includes('每小時')) {
      add(o.bedLabel, { 藥物使用頻率: 0 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: 'STAT Q1H 監測（血壓/生命徵象）',
        kind: '監測',
        orderedAt: now,
        orderedBy: '（匯入醫囑）',
      })
    }
  }

  return byBed
}

/** @deprecated 使用 deriveObjectiveAndStatOrders */
export const deriveObjectiveAndTodos = deriveObjectiveAndStatOrders

function nowHHMM() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function sumPatch(
  base: Partial<ObjectiveFactors>,
  patch: Partial<ObjectiveFactors>,
): Partial<ObjectiveFactors> {
  const out: Partial<ObjectiveFactors> = { ...base }
  for (const [k, v] of Object.entries(patch) as [ObjectiveFactorKey, number][]) {
    out[k] = (out[k] ?? 0) + v
  }
  return out
}

function normalizeBed(bed: string) {
  return parseBedKey(bed)
}

function cryptoId() {
  // 原型用：避免引入 uuid 依賴
  const a = Math.random().toString(16).slice(2)
  const b = Date.now().toString(16)
  return `${b}-${a}`
}

