import { INITIAL_BY_NURSE, NURSES, PATIENTS, type NurseId } from '../data/allocationMock'

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
  diagnosis: string
  sex: Sex
  age: number
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

export type OrderItem = {
  bedLabel: string
  text: string
}

export type ShiftKey = 'day'

const store = {
  lastImportedAt: undefined as string | undefined,
  onDutyCharge: '小組長 李小華' as string,
  currentNurseId: 'n1' as NurseId,
  currentShift: 'day' as ShiftKey,
  patients: [
    {
      bedId: 'bed1',
      bedLabel: '床 1',
      diagnosis: 'ARDS',
      sex: '男',
      age: 68,
      attendingPhysician: '張志明醫師',
      objective: {
        負壓隔離病房: 1,
        高呼吸器需求: 1,
        藥物種類數: 6,
        藥物使用頻率: 8,
        'CRRT（持續型 A）': 1,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 1,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
      subjective: {
        'RASS 鎮靜分數（原始數值）': -3,
        '躁動且有下床風險': false,
        '躁動且有拔管風險': true,
        '引流管': false,
        '需人工管灌': true,
        '換藥頻繁程度': 1,
        '生理狀態監測頻繁程度': 2,
      },
    },
    {
      bedId: 'bed2',
      bedLabel: '床 2',
      diagnosis: '敗血症',
      sex: '女',
      age: 74,
      attendingPhysician: '林怡君醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 8,
        藥物使用頻率: 10,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 1,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 1,
      },
      subjective: {
        'RASS 鎮靜分數（原始數值）': 2,
        '躁動且有下床風險': true,
        '躁動且有拔管風險': true,
        '引流管': true,
        '需人工管灌': false,
        '換藥頻繁程度': 1,
        '生理狀態監測頻繁程度': 2,
      },
    },
    {
      bedId: 'bed3',
      bedLabel: '床 3',
      diagnosis: '術後照護',
      sex: '男',
      age: 52,
      attendingPhysician: '王建宏醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 3,
        藥物使用頻率: 4,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
      subjective: {
        'RASS 鎮靜分數（原始數值）': 0,
        '躁動且有下床風險': false,
        '躁動且有拔管風險': false,
        '引流管': true,
        '需人工管灌': false,
        '換藥頻繁程度': 1,
        '生理狀態監測頻繁程度': 1,
      },
    },
    {
      bedId: 'bed4',
      bedLabel: '床 4',
      diagnosis: 'COPD 急性惡化',
      sex: '女',
      age: 81,
      attendingPhysician: '陳美玲醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 5,
        藥物使用頻率: 6,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed5',
      bedLabel: '床 5',
      diagnosis: '心衰竭急性惡化',
      sex: '男',
      age: 77,
      attendingPhysician: '李承翰醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 6,
        藥物使用頻率: 7,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 1,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed6',
      bedLabel: '床 6',
      diagnosis: '腦中風（急性期）',
      sex: '女',
      age: 66,
      attendingPhysician: '周雅雯醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 5,
        藥物使用頻率: 6,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed7',
      bedLabel: '床 7',
      diagnosis: '肺炎併呼吸衰竭',
      sex: '男',
      age: 59,
      attendingPhysician: '郭柏宏醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 1,
        藥物種類數: 6,
        藥物使用頻率: 8,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed8',
      bedLabel: '床 8',
      diagnosis: '上消化道出血',
      sex: '女',
      age: 70,
      attendingPhysician: '許心怡醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 5,
        藥物使用頻率: 6,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed9',
      bedLabel: '床 9',
      diagnosis: '腎衰竭（洗腎評估）',
      sex: '男',
      age: 63,
      attendingPhysician: '黃冠霖醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 4,
        藥物使用頻率: 5,
        'CRRT（持續型 A）': 1,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed10',
      bedLabel: '床 10',
      diagnosis: '糖尿病酮酸中毒',
      sex: '女',
      age: 45,
      attendingPhysician: '吳怡婷醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 7,
        藥物使用頻率: 10,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed11',
      bedLabel: '床 11',
      diagnosis: '多發外傷（術後）',
      sex: '男',
      age: 33,
      attendingPhysician: '邱子豪醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 6,
        藥物使用頻率: 7,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 1,
      },
    },
    {
      bedId: 'bed12',
      bedLabel: '床 12',
      diagnosis: '胰臟炎（重症）',
      sex: '女',
      age: 58,
      attendingPhysician: '蔡佩珊醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 6,
        藥物使用頻率: 8,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 1,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed13',
      bedLabel: '床 13',
      diagnosis: '敗血性休克',
      sex: '男',
      age: 72,
      attendingPhysician: '鄭文彥醫師',
      objective: {
        負壓隔離病房: 1,
        高呼吸器需求: 1,
        藥物種類數: 9,
        藥物使用頻率: 12,
        'CRRT（持續型 A）': 1,
        'IABP（持續型 B）': 1,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 1,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed14',
      bedLabel: '床 14',
      diagnosis: '心肌梗塞（PCI 後）',
      sex: '女',
      age: 64,
      attendingPhysician: '何冠廷醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 5,
        藥物使用頻率: 6,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 1,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed15',
      bedLabel: '床 15',
      diagnosis: '腸阻塞（術前）',
      sex: '男',
      age: 56,
      attendingPhysician: '杜承恩醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 3,
        藥物使用頻率: 4,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
    {
      bedId: 'bed16',
      bedLabel: '床 16',
      diagnosis: '肝硬化併腹水',
      sex: '女',
      age: 61,
      attendingPhysician: '蘇雅婷醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 4,
        藥物使用頻率: 5,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 1,
      },
    },
    {
      bedId: 'bed17',
      bedLabel: '床 17',
      diagnosis: '感染性腦膜炎',
      sex: '男',
      age: 49,
      attendingPhysician: '方志豪醫師',
      objective: {
        負壓隔離病房: 0,
        高呼吸器需求: 0,
        藥物種類數: 6,
        藥物使用頻率: 7,
        'CRRT（持續型 A）': 0,
        'IABP（持續型 B）': 0,
        'ECMO（持續型 B）': 0,
        'PRONE（持續型B）': 0,
        '低溫治療（持續性 B）': 0,
        '大量輸血（單次 C）': 0,
        '跟Plasma（單次C）': 0,
      },
    },
  ] as Patient[],
  tasks: [
    // 床 1
    { id: 't1', bedLabel: '床 1 — ARDS', title: '翻身/俯臥評估與協助', kind: '監測', urgent: true },
    { id: 't2', bedLabel: '床 1 — ARDS', title: '抽痰與呼吸道管路照護', kind: '監測' },
    { id: 't3', bedLabel: '床 1 — ARDS', title: 'ABG 送驗與結果追蹤', kind: '檢查', urgent: true },
    { id: 't4', bedLabel: '床 1 — ARDS', title: '補登生命徵象/呼吸器紀錄（07:00–09:00）', kind: '紀錄', done: true, at: '09:12' },

    // 床 2
    { id: 't5', bedLabel: '床 2 — 敗血症', title: '抽血 CBC/Diff', kind: '檢查', urgent: true },
    { id: 't6', bedLabel: '床 2 — 敗血症', title: 'Norepinephrine drip 目標壓/滴速確認', kind: '給藥', urgent: true },
    { id: 't7', bedLabel: '床 2 — 敗血症', title: 'Vancomycin 給藥（18:30）', kind: '給藥' },
    { id: 't8', bedLabel: '床 2 — 敗血症', title: 'I/O 統計與輸液量確認', kind: '紀錄' },
    { id: 't9', bedLabel: '床 2 — 敗血症', title: '家屬更新病況（下午探視）', kind: '家屬' },
    { id: 't10', bedLabel: '床 2 — 敗血症', title: '量血壓 Q1H（10:00）', kind: '監測', done: true, at: '10:05' },

    // 床 3
    { id: 't11', bedLabel: '床 3 — 術後照護', title: '傷口換藥（10:00）', kind: '檢查', urgent: true },
    { id: 't12', bedLabel: '床 3 — 術後照護', title: '疼痛評估與止痛藥效果追蹤', kind: '給藥' },
    { id: 't13', bedLabel: '床 3 — 術後照護', title: '引流量/出血狀況觀察', kind: '監測' },
    { id: 't14', bedLabel: '床 3 — 術後照護', title: '術後衛教重點整理（活動/飲食）', kind: '家屬' },
    { id: 't15', bedLabel: '床 3 — 術後照護', title: '完成交班整理（重點/待追蹤）', kind: '紀錄' },
  ] as Task[],
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
  // 原型：以 allocationMock 的分配結果當作「當班分配」
  const ids = INITIAL_BY_NURSE[store.currentNurseId] ?? []
  return ids
    .map((pid) => PATIENTS[pid]?.label ?? '')
    .map((label) => {
      const m = label.match(/^床\s*(\d+)\b/)
      return m ? `床 ${m[1]}` : ''
    })
    .filter(Boolean)
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

export function parseOrders(text: string): OrderItem[] {
  // 輕量原型：每行格式「床 2: Vancomycin q12h」或「床2 Vancomycin q12h」
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const out: OrderItem[] = []
  for (const line of lines) {
    const m =
      line.match(/^(床\s*\d+)\s*[:：]?\s*(.+)$/) ??
      line.match(/^(bed\s*\d+)\s*[:：]?\s*(.+)$/i)
    if (m) out.push({ bedLabel: normalizeBed(m[1]), text: m[2].trim() })
  }
  return out
}

export function deriveObjectiveAndTodos(orders: OrderItem[]) {
  // 原型規則（可替換成你們報告內的正式規則）
  // - 含 drip / 升壓藥 / Norepinephrine → 客觀+5、TO‑DO: 滴速確認（急）
  // - 含 Vancomycin / antibiotic → 客觀+2、TO‑DO: 給藥
  // - 含 CBC / 抽血 / lab → 客觀+2、TO‑DO: 抽血（急）
  // - 含 Q1H / 每小時 → 客觀+1、TO‑DO: 監測
  const byBed = new Map<
    string,
    { objective: Partial<ObjectiveFactors>; tasks: Task[] }
  >()
  const add = (
    bedLabel: string,
    patch: Partial<ObjectiveFactors>,
    task?: Omit<Task, 'id'>,
  ) => {
    const cur = byBed.get(bedLabel) ?? { objective: {}, tasks: [] as Task[] }
    cur.objective = { ...cur.objective, ...sumPatch(cur.objective, patch) }
    if (task) cur.tasks.push({ id: cryptoId(), ...task })
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
        title: '升壓藥滴速/目標壓確認',
        kind: '給藥',
        urgent: true,
        },
      )
    }
    if (t.includes('vancomycin') || t.includes('antibiotic') || t.includes('抗生素')) {
      add(o.bedLabel, { 藥物使用頻率: 1, 藥物種類數: 1 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: '抗生素給藥',
        kind: '給藥',
      })
    }
    if (t.includes('cbc') || t.includes('抽血') || t.includes('lab')) {
      add(o.bedLabel, { '大量輸血（單次 C）': 0 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: '抽血/檢體送驗',
        kind: '檢查',
        urgent: true,
      })
    }
    if (t.includes('q1h') || t.includes('每小時')) {
      add(o.bedLabel, { 藥物使用頻率: 0 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: 'Q1H 監測（血壓/生命徵象）',
        kind: '監測',
      })
    }
  }

  return byBed
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
  const m = bed.match(/(\d+)/)
  return m ? `床 ${m[1]}` : bed.replace(/\s+/g, ' ').trim()
}

function cryptoId() {
  // 原型用：避免引入 uuid 依賴
  const a = Math.random().toString(16).slice(2)
  const b = Date.now().toString(16)
  return `${b}-${a}`
}

