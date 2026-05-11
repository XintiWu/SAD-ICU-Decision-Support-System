import { admissions, currentAssignments, ids } from './step1Data.mjs'

export const objectiveFactorDefinitions = [
  { code: 'negativePressureIsolation', label: '負壓隔離病房', valueType: 'number' },
  { code: 'highVentilatorDemand', label: '高呼吸器需求', valueType: 'number' },
  { code: 'medicationTypeCount', label: '藥物種類數', valueType: 'number' },
  { code: 'medicationFrequency', label: '藥物使用頻率', valueType: 'number' },
  { code: 'crrtContinuousA', label: 'CRRT（持續型 A）', valueType: 'number' },
  { code: 'iabpContinuousB', label: 'IABP（持續型 B）', valueType: 'number' },
  { code: 'ecmoContinuousB', label: 'ECMO（持續型 B）', valueType: 'number' },
  { code: 'proneContinuousB', label: 'PRONE（持續型B）', valueType: 'number' },
  { code: 'hypothermiaContinuousB', label: '低溫治療（持續性 B）', valueType: 'number' },
  { code: 'massiveTransfusionSingleC', label: '大量輸血（單次 C）', valueType: 'number' },
  { code: 'plasmaSingleC', label: '跟Plasma（單次C）', valueType: 'number' },
]

export const subjectiveFactorDefinitions = [
  { code: 'rassScore', label: 'RASS 鎮靜分數（原始數值）', valueType: 'number' },
  { code: 'agitatedFallRisk', label: '躁動且有下床風險', valueType: 'boolean' },
  { code: 'agitatedTubeRemovalRisk', label: '躁動且有拔管風險', valueType: 'boolean' },
  { code: 'drainageTube', label: '引流管', valueType: 'boolean' },
  { code: 'tubeFeeding', label: '需人工管灌', valueType: 'boolean' },
  { code: 'dressingChangeFrequency', label: '換藥頻繁程度', valueType: 'level' },
  { code: 'vitalMonitoringFrequency', label: '生理狀態監測頻繁程度', valueType: 'level' },
]

const objectiveRows = [
  [1, 1, 6, 8, 1, 0, 0, 1, 0, 0, 0],
  [0, 0, 8, 10, 0, 1, 0, 0, 0, 1, 1],
  [0, 0, 3, 4, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 5, 6, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 6, 7, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 6, 8, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 5, 6, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 4, 5, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 7, 10, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 6, 7, 0, 0, 0, 0, 0, 1, 1],
  [0, 0, 6, 8, 0, 0, 0, 0, 1, 0, 0],
  [1, 1, 9, 12, 1, 1, 0, 1, 0, 1, 0],
  [0, 0, 5, 6, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 3, 4, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 4, 5, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 6, 7, 0, 0, 0, 0, 0, 0, 0],
]

const subjectiveByNo = new Map([
  [1, { rassScore: -3, agitatedFallRisk: false, agitatedTubeRemovalRisk: true, drainageTube: false, tubeFeeding: true, dressingChangeFrequency: 1, vitalMonitoringFrequency: 2 }],
  [2, { rassScore: 2, agitatedFallRisk: true, agitatedTubeRemovalRisk: true, drainageTube: true, tubeFeeding: false, dressingChangeFrequency: 1, vitalMonitoringFrequency: 2 }],
  [3, { rassScore: 0, agitatedFallRisk: false, agitatedTubeRemovalRisk: false, drainageTube: true, tubeFeeding: false, dressingChangeFrequency: 1, vitalMonitoringFrequency: 1 }],
])

export const burdenAssessments = admissions.map((admission, index) => {
  const no = index + 1
  const objective = Object.fromEntries(
    objectiveFactorDefinitions.map((factor, factorIndex) => [factor.code, objectiveRows[index]?.[factorIndex] ?? 0]),
  )
  const subjective = subjectiveByNo.get(no) ?? null

  return {
    id: `00000000-0000-0000-0000-${String(600 + no).padStart(12, '0')}`,
    shiftId: ids.currentShift,
    admissionId: admission.id,
    submittedBy: ownerForAdmission(admission.id),
    status: subjective ? 'submitted' : 'draft',
    objective,
    subjective,
    submittedAt: subjective ? '2026-05-08T12:00:00+08:00' : null,
    updatedAt: '2026-05-08T12:00:00+08:00',
  }
})

export const tasks = [
  { id: '00000000-0000-0000-0000-000000000701', admissionId: aid(1), title: '翻身/俯臥評估與協助', kind: '監測', urgent: true, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000702', admissionId: aid(1), title: '抽痰與呼吸道管路照護', kind: '監測', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000703', admissionId: aid(1), title: 'ABG 送驗與結果追蹤', kind: '檢查', urgent: true, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000704', admissionId: aid(1), title: '補登生命徵象/呼吸器紀錄（07:00-09:00）', kind: '紀錄', urgent: false, status: 'done', completedAt: '2026-05-08T09:12:00+08:00' },
  { id: '00000000-0000-0000-0000-000000000705', admissionId: aid(2), title: '抽血 CBC/Diff', kind: '檢查', urgent: true, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000706', admissionId: aid(2), title: 'Norepinephrine drip 目標壓/滴速確認', kind: '給藥', urgent: true, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000707', admissionId: aid(2), title: 'Vancomycin 給藥（18:30）', kind: '給藥', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000708', admissionId: aid(2), title: 'I/O 統計與輸液量確認', kind: '紀錄', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000709', admissionId: aid(2), title: '家屬更新病況（下午探視）', kind: '家屬', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000710', admissionId: aid(2), title: '量血壓 Q1H（10:00）', kind: '監測', urgent: false, status: 'done', completedAt: '2026-05-08T10:05:00+08:00' },
  { id: '00000000-0000-0000-0000-000000000711', admissionId: aid(3), title: '傷口換藥（10:00）', kind: '檢查', urgent: true, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000712', admissionId: aid(3), title: '疼痛評估與止痛藥效果追蹤', kind: '給藥', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000713', admissionId: aid(3), title: '引流量/出血狀況觀察', kind: '監測', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000714', admissionId: aid(3), title: '術後衛教重點整理（活動/飲食）', kind: '家屬', urgent: false, status: 'pending' },
  { id: '00000000-0000-0000-0000-000000000715', admissionId: aid(3), title: '完成交班整理（重點/待追蹤）', kind: '紀錄', urgent: false, status: 'pending' },
].map((task) => ({
  ...task,
  shiftId: ids.currentShift,
  assignedNurseId: ownerForAdmission(task.admissionId),
  source: 'system',
  createdAt: '2026-05-08T06:00:00+08:00',
}))

function aid(no) {
  return `00000000-0000-0000-0000-${String(500 + no).padStart(12, '0')}`
}

function ownerForAdmission(admissionId) {
  return currentAssignments.find((assignment) => assignment.admissionIds.includes(admissionId))?.nurseId ?? null
}

