import type { PatientId } from './allocationMock'
import type {
  BedId,
  ObjectiveFactors,
  Patient,
  Sex,
  StatOrder,
  StatOrderKind,
  SubjectiveFactors,
  SubjectiveLevel,
  Task,
} from '../state/demoStore'
import simulationRows from '../../病人模擬資料.json'

type SimulationRow = (typeof simulationRows)[number]

export const CHARGE_NURSE_NAME = '陳O琪'

export const SIMULATION_NURSES = {
  n1: { id: 'n1' as const, label: '護理師 — 陳O媚', shortName: '陳O媚' },
  n2: { id: 'n2' as const, label: '護理師 — 許O文', shortName: '許O文' },
  n3: { id: 'n3' as const, label: '護理師 — 李O慧', shortName: '李O慧' },
  n4: { id: 'n4' as const, label: '護理師 — 詹O霏', shortName: '詹O霏' },
  n5: { id: 'n5' as const, label: '護理師 — 石O廷', shortName: '石O廷' },
  n6: { id: 'n6' as const, label: '護理師 — 高O欣', shortName: '高O欣' },
  n7: { id: 'n7' as const, label: '護理師 — 周O珊', shortName: '周O珊' },
  n8: { id: 'n8' as const, label: '護理師 — 李O華', shortName: '李O華' },
  n9: { id: 'n9' as const, label: '護理師 — 林O新', shortName: '林O新' },
}

const BURDEN_SCORES: Record<string, number> = {
  'MI-01': 55,
  'MI-02': 0,
  'MI-03': 105,
  'MI-04': 55,
  'MI-05': 20,
  'MI-06': 65,
  'MI-07': 50,
  'MI-08': 30,
  'MI-09': 60,
  'MI-10': 25,
  'MI-11': 10,
  'MI-12': 95,
  'MI-13': 35,
  'MI-14': 20,
  'MI-15': 20,
  'MI-16': 30,
  'MI-17': 45,
}

export function parseBedKey(label: string): string {
  const mi = label.match(/^(MI-\d+)/i)
  if (mi) return mi[1].toUpperCase()
  const legacy = label.match(/^床\s*(\d+)/)
  if (legacy) return `MI-${legacy[1].padStart(2, '0')}`
  return label.trim()
}

const BED_IDS = [
  'bed1',
  'bed2',
  'bed3',
  'bed4',
  'bed5',
  'bed6',
  'bed7',
  'bed8',
  'bed9',
  'bed10',
  'bed11',
  'bed12',
  'bed13',
  'bed14',
  'bed15',
  'bed16',
  'bed17',
] as const satisfies readonly BedId[]

function bedIdFromIndex(index: number): BedId {
  return BED_IDS[index] ?? 'bed1'
}

function patientIdFromIndex(index: number): PatientId {
  return `p${index + 1}` as PatientId
}

function parseAdmittedAt(value: string) {
  const parts = value.split('/')
  if (parts.length !== 3) return value
  const [y, m, d] = parts
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function parseRass(raw: string | undefined): number | null {
  if (!raw) return null
  const m = raw.match(/RASS\s*=\s*([+-]?\d+)/i)
  return m ? Number(m[1]) : null
}

function yesNoToBool(raw: string | undefined) {
  return raw === '是'
}

function scoreToLevel(score: number): SubjectiveLevel {
  if (score >= 15) return 2
  if (score >= 10) return 1
  return 0
}

function mapObjective(row: SimulationRow): ObjectiveFactors {
  const o = row.客觀評估
  const objective: ObjectiveFactors = {
    負壓隔離病房: o['是否需住在負壓隔離病房']?.分數 ?? 0,
    高呼吸器需求: o['高呼吸器需求']?.分數 ?? 0,
    藥物種類數: o['藥物計數']?.分數 ?? 0,
    藥物使用頻率: o['需頻繁監測生理狀態']?.分數 ?? 0,
    'CRRT（持續型 A）': 0,
    'IABP（持續型 B）': 0,
    'ECMO（持續型 B）': 0,
    'PRONE（持續型B）': 0,
    '低溫治療（持續性 B）': 0,
    '大量輸血（單次 C）': 0,
    '跟Plasma（單次C）': 0,
  }

  for (const item of o['特殊處置']?.系統帶入項目 ?? []) {
    const name = item.項目
    const pts = item.分數
    if (name === 'IABP') objective['IABP（持續型 B）'] = pts
    else if (name === 'CRRT') objective['CRRT（持續型 A）'] = pts
    else if (name === 'Cooling Therapy') objective['低溫治療（持續性 B）'] = pts
    else if (name === 'Plasma Exchange') objective['跟Plasma（單次C）'] = pts
    else if (name === 'External Ventricular Drain') objective['大量輸血（單次 C）'] = Math.max(objective['大量輸血（單次 C）'], pts)
    else if (name === 'Regular HD' || name === 'TCP' || name === 'VAC wound therapy') {
      objective['藥物使用頻率'] = Math.max(objective['藥物使用頻率'], pts)
    }
  }

  for (const item of o['待執行的特殊檢查項目']?.系統帶入項目 ?? []) {
    if (item.項目 && item.項目 !== '否' && item.項目 !== '無') {
      objective['藥物種類數'] = Math.max(objective['藥物種類數'], item.分數)
    }
  }

  const tube = o['是否具特殊管路']
  if (tube?.選擇項目 && tube.選擇項目 !== '否') {
    objective['藥物種類數'] = Math.max(objective['藥物種類數'], tube.分數)
  }

  return objective
}

function mapSubjective(row: SimulationRow): SubjectiveFactors {
  const s = row.主觀評估
  const tube = row.客觀評估['是否具特殊管路']
  const hasDrainage = !!(tube?.選擇項目 && tube.選擇項目 !== '否')

  return {
    'RASS 鎮靜分數（原始數值）': parseRass(s['RASS鎮靜分數']?.選擇結果),
    '躁動且有下床風險': yesNoToBool(s['躁動且有下床風險']?.選擇結果),
    '躁動且有拔管風險': yesNoToBool(s['躁動且有自拔管路風險']?.選擇結果),
    引流管: hasDrainage,
    需人工管灌: yesNoToBool(s['是否需人工管灌']?.選擇結果),
    換藥頻繁程度: scoreToLevel(s['是否需頻繁換藥']?.分數 ?? 0),
    生理狀態監測頻繁程度: scoreToLevel(row.客觀評估['需頻繁監測生理狀態']?.分數 ?? 0),
  }
}

function shortDiagnosis(diagnosis: string) {
  const first = diagnosis.split(',')[0]?.trim() ?? diagnosis
  return first.length > 28 ? `${first.slice(0, 28)}…` : first
}

function scoreTone(score: number): 'high' | 'mid' | 'low' {
  if (score >= 22) return 'high'
  if (score >= 14) return 'mid'
  return 'low'
}

function classifyStatKind(title: string): StatOrderKind {
  const t = title.toLowerCase()
  if (t.includes('會診') || t.includes('召開') || t.includes('act ')) return '其他'
  if (t.includes('bolus') || t.includes('iv ') || t.includes('po ') || t.includes('propofol') || t.includes('furosemide')) {
    return '給藥'
  }
  if (t.includes('echo') || t.includes('cxr') || t.includes('x-ray') || t.includes('abg') || t.includes('culture') || t.includes('cbc') || t.includes('lab') || t.includes('ecg') || t.includes('troponin') || t.includes('osmolality') || t.includes('check ')) {
    return '檢查'
  }
  return '檢查'
}

function buildStatOrders(rows: SimulationRow[]): StatOrder[] {
  const out: StatOrder[] = []
  let seq = 0
  const times = ['09:40', '10:05', '10:22', '10:48', '11:05', '11:18', '11:32']

  for (const row of rows) {
    const statList = row['STAT Order']
    if (!statList?.length) continue
    const bedLabel = row['床號']
    const physician = `${row['主治醫師']}醫師`

    statList.forEach((title, index) => {
      seq += 1
      out.push({
        id: `stat-${seq}`,
        bedLabel,
        title: title.startsWith('STAT') ? title : `STAT ${title}`,
        kind: classifyStatKind(title),
        orderedAt: times[(seq + index) % times.length] ?? '10:30',
        orderedBy: physician,
      })
    })
  }

  return out
}

function buildTasks(rows: SimulationRow[]): Task[] {
  const out: Task[] = []
  let seq = 0

  for (const row of rows) {
    const bedLabel = row['床號']
    const drugs = row['當班使用藥物清單'] ?? []
    const exams = row['當班開立檢查清單'] ?? []

    for (const drug of drugs.slice(0, 2)) {
      seq += 1
      out.push({
        id: `task-${seq}`,
        bedLabel,
        title: drug,
        kind: '給藥',
        urgent: /norepinephrine|vasopressin|fentanyl/i.test(drug),
      })
    }

    for (const exam of exams.slice(0, 2)) {
      seq += 1
      out.push({
        id: `task-${seq}`,
        bedLabel,
        title: exam,
        kind: '檢查',
      })
    }
  }

  return out
}

export function buildSimulationPatients(): Patient[] {
  return simulationRows.map((row, index) => {
    const bedLabel = row['床號']
    const objective = mapObjective(row)
    const subjective = mapSubjective(row)

    return {
      bedId: bedIdFromIndex(index),
      bedLabel,
      patientName: row['病人姓名'],
      diagnosis: row['診斷'].trim(),
      sex: row['性別'] as Sex,
      age: Number(row['年齡']),
      admittedAt: parseAdmittedAt(row['住院日期']),
      attendingPhysician: `${row['主治醫師']}醫師`,
      objective,
      subjective,
    }
  })
}

export function buildSimulationPatientMocks() {
  return simulationRows.map((row, index) => {
    const id = patientIdFromIndex(index)
    const bedLabel = row['床號']
    const score = BURDEN_SCORES[bedLabel] ?? 0
    return {
      id,
      label: `${bedLabel} — ${shortDiagnosis(row['診斷'])}`,
      score,
      tone: scoreTone(score),
    }
  })
}

export const SIMULATION_PATIENTS = buildSimulationPatients()
export const SIMULATION_PATIENT_MOCKS = buildSimulationPatientMocks()
export const SIMULATION_STAT_ORDERS = buildStatOrders(simulationRows)
export const SIMULATION_TASKS = buildTasks(simulationRows)

export const SIMULATION_BED_PATIENT: Record<string, string> = Object.fromEntries(
  SIMULATION_PATIENT_MOCKS.map((p) => {
    const bed = parseBedKey(p.label)
    return [bed, p.label]
  }),
)
