export type BedId = 'bed1' | 'bed2' | 'bed3'

export type Patient = {
  bedId: BedId
  bedLabel: string
  diagnosis: string
  objective: ObjectiveFactors
  subjective?: SubjectiveFactors
}

export type ObjectiveFactorKey =
  | '病情嚴重度'
  | '藥物與輸液頻率'
  | '檢查與處置次數'
  | '監測需求'
  | '特殊照護需求'

export type ObjectiveFactors = Record<ObjectiveFactorKey, number>

export type SubjectiveFactorKey =
  | '病人活動/翻身協助'
  | '給藥與點滴處理'
  | '檢查與處置配合'
  | '監測與紀錄頻率'
  | '呼吸道/管路照護'
  | '傷口/皮膚照護'
  | '家屬溝通與衛教'
  | '文書/交班整理'

export type SubjectiveLevel = 0 | 1 | 2
export type SubjectiveFactors = Record<SubjectiveFactorKey, SubjectiveLevel>

export function objectiveTotal(o: ObjectiveFactors) {
  return Object.values(o).reduce((a, b) => a + b, 0)
}

export function subjectiveTotal(s: SubjectiveFactors) {
  return Object.values(s).reduce<number>((a, b) => a + b, 0)
}

export type HandoverItem = {
  bedLabel: string
  summary: string
  risk?: 'high' | 'mid' | 'low'
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

const store = {
  lastImportedAt: undefined as string | undefined,
  lastHandoverAt: '2026-04-23T06:00:00.000Z' as string,
  lastHandoverBy: '護理師 陳美麗' as string,
  nextHandoverAt: '2026-04-23T14:00:00.000Z' as string,
  handover: [
    {
      bedLabel: '床 1',
      summary: '俯臥/翻身配合需協助；留意 SpO₂ 與呼吸器參數；抽血結果待回報',
      risk: 'mid',
    },
    {
      bedLabel: '床 2',
      summary: '血壓偏不穩；Norepinephrine 需留意；Vancomycin 下一次 18:30；抽血結果待回報',
      risk: 'high',
    },
    {
      bedLabel: '床 3',
      summary: '術後換藥時間 10:00；觀察出血與疼痛；輸液量需記錄',
      risk: 'low',
    },
  ] as HandoverItem[],
  patients: [
    {
      bedId: 'bed1',
      bedLabel: '床 1',
      diagnosis: 'ARDS',
      objective: {
        病情嚴重度: 5,
        藥物與輸液頻率: 2,
        檢查與處置次數: 2,
        監測需求: 2,
        特殊照護需求: 1,
      },
      subjective: {
        '病人活動/翻身協助': 2,
        '給藥與點滴處理': 2,
        '檢查與處置配合': 1,
        '監測與紀錄頻率': 2,
        '呼吸道/管路照護': 2,
        '傷口/皮膚照護': 1,
        '家屬溝通與衛教': 0,
        '文書/交班整理': 1,
      },
    },
    {
      bedId: 'bed2',
      bedLabel: '床 2',
      diagnosis: '敗血症',
      objective: {
        病情嚴重度: 4,
        藥物與輸液頻率: 3,
        檢查與處置次數: 2,
        監測需求: 3,
        特殊照護需求: 2,
      },
      subjective: {
        '病人活動/翻身協助': 1,
        '給藥與點滴處理': 2,
        '檢查與處置配合': 2,
        '監測與紀錄頻率': 2,
        '呼吸道/管路照護': 2,
        '傷口/皮膚照護': 1,
        '家屬溝通與衛教': 1,
        '文書/交班整理': 1,
      },
    },
    {
      bedId: 'bed3',
      bedLabel: '床 3',
      diagnosis: '術後照護',
      objective: {
        病情嚴重度: 2,
        藥物與輸液頻率: 1,
        檢查與處置次數: 1,
        監測需求: 1,
        特殊照護需求: 0,
      },
      subjective: {
        '病人活動/翻身協助': 1,
        '給藥與點滴處理': 1,
        '檢查與處置配合': 1,
        '監測與紀錄頻率': 1,
        '呼吸道/管路照護': 0,
        '傷口/皮膚照護': 1,
        '家屬溝通與衛教': 1,
        '文書/交班整理': 1,
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

export function getLastHandoverAt() {
  return store.lastHandoverAt
}

export function getLastHandoverBy() {
  return store.lastHandoverBy
}

export function getNextHandoverAt() {
  return store.nextHandoverAt
}

export function getHandoverItems() {
  return store.handover
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
        { 藥物與輸液頻率: 2, 監測需求: 2, 病情嚴重度: 1 },
        {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: '升壓藥滴速/目標壓確認',
        kind: '給藥',
        urgent: true,
        },
      )
    }
    if (t.includes('vancomycin') || t.includes('antibiotic') || t.includes('抗生素')) {
      add(o.bedLabel, { 藥物與輸液頻率: 1 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: '抗生素給藥',
        kind: '給藥',
      })
    }
    if (t.includes('cbc') || t.includes('抽血') || t.includes('lab')) {
      add(o.bedLabel, { 檢查與處置次數: 1 }, {
        bedLabel: `${o.bedLabel} — (匯入)`,
        title: '抽血/檢體送驗',
        kind: '檢查',
        urgent: true,
      })
    }
    if (t.includes('q1h') || t.includes('每小時')) {
      add(o.bedLabel, { 監測需求: 1 }, {
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

