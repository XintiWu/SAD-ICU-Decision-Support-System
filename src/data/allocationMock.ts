export type NurseId = 'n1' | 'n2' | 'n3' | 'n4' | 'n5' | 'n6' | 'n7' | 'n8' | 'n9'
export type PatientId =
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'p5'
  | 'p6'
  | 'p7'
  | 'p8'
  | 'p9'
  | 'p10'
  | 'p11'
  | 'p12'
  | 'p13'
  | 'p14'
  | 'p15'
  | 'p16'
  | 'p17'

export type Nurse = {
  id: NurseId
  label: string
  shortName: string
}

export type Patient = {
  id: PatientId
  label: string
  score: number
  tone: 'high' | 'mid' | 'low'
}

export const NURSES: Record<NurseId, Nurse> = {
  n1: { id: 'n1', label: '護理師 A — 王小明', shortName: '王小明' },
  n2: { id: 'n2', label: '護理師 B — 陳美麗', shortName: '陳美麗' },
  n3: { id: 'n3', label: '護理師 C — 林志強', shortName: '林志強' },
  n4: { id: 'n4', label: '護理師 D — 張雅婷', shortName: '張雅婷' },
  n5: { id: 'n5', label: '護理師 E — 李家豪', shortName: '李家豪' },
  n6: { id: 'n6', label: '護理師 F — 吳佩珊', shortName: '吳佩珊' },
  n7: { id: 'n7', label: '護理師 G — 周柏宇', shortName: '周柏宇' },
  n8: { id: 'n8', label: '護理師 H — 黃思涵', shortName: '黃思涵' },
  n9: { id: 'n9', label: '護理師 I — 何俊傑', shortName: '何俊傑' },
}

export const PATIENTS: Record<PatientId, Patient> = {
  p1: { id: 'p1', label: '床 1 — ARDS', score: 16, tone: 'high' },
  p2: { id: 'p2', label: '床 2 — 敗血症', score: 17, tone: 'high' },
  p3: { id: 'p3', label: '床 3 — 術後照護', score: 9, tone: 'low' },
  p4: { id: 'p4', label: '床 4 — 腎衰竭', score: 14, tone: 'mid' },
  p5: { id: 'p5', label: '床 5 — 心衰竭', score: 18, tone: 'high' },
  p6: { id: 'p6', label: '床 6 — 消化道出血', score: 12, tone: 'mid' },
  p7: { id: 'p7', label: '床 7 — COPD', score: 9, tone: 'low' },
  p8: { id: 'p8', label: '床 8 — 中風', score: 13, tone: 'mid' },
  p9: { id: 'p9', label: '床 9 — 肺炎', score: 11, tone: 'mid' },
  p10: { id: 'p10', label: '床 10 — 心肌梗塞', score: 15, tone: 'high' },
  p11: { id: 'p11', label: '床 11 — 休克', score: 19, tone: 'high' },
  p12: { id: 'p12', label: '床 12 — 術後觀察', score: 8, tone: 'low' },
  p13: { id: 'p13', label: '床 13 — 肝硬化', score: 10, tone: 'low' },
  p14: { id: 'p14', label: '床 14 — 多重外傷', score: 18, tone: 'high' },
  p15: { id: 'p15', label: '床 15 — DKA', score: 13, tone: 'mid' },
  p16: { id: 'p16', label: '床 16 — 癲癇重積', score: 12, tone: 'mid' },
  p17: { id: 'p17', label: '床 17 — 呼吸衰竭', score: 16, tone: 'high' },
}

export const INITIAL_UNASSIGNED: PatientId[] = ['p5', 'p9', 'p14', 'p17']

export const INITIAL_BY_NURSE: Record<NurseId, PatientId[]> = {
  n1: ['p2', 'p7'],
  n2: ['p3', 'p6'],
  n3: ['p12'],
  n4: ['p1'],
  n5: ['p4', 'p13'],
  n6: ['p8'],
  n7: ['p10'],
  n8: ['p11'],
  n9: ['p15', 'p16'],
}

