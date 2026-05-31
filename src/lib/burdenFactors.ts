import { defaultSubjective, type BurdenAssessment, type SubjectivePayload } from '../api/client'

export type ObjectiveFactorKey =
  | 'negativePressureIsolation'
  | 'highVentilatorDemand'
  | 'medicationTypeCount'
  | 'medicationFrequency'
  | 'crrtContinuousA'
  | 'iabpContinuousB'
  | 'ecmoContinuousB'
  | 'proneContinuousB'
  | 'hypothermiaContinuousB'
  | 'massiveTransfusionSingleC'
  | 'plasmaSingleC'

export const OBJECTIVE_FACTOR_LABELS: Record<ObjectiveFactorKey, string> = {
  negativePressureIsolation: '負壓隔離病房',
  highVentilatorDemand: '高呼吸器需求',
  medicationTypeCount: '藥物種類數',
  medicationFrequency: '藥物使用頻率',
  crrtContinuousA: 'CRRT',
  iabpContinuousB: 'IABP',
  ecmoContinuousB: 'ECMO',
  proneContinuousB: 'PRONE',
  hypothermiaContinuousB: '低溫治療',
  massiveTransfusionSingleC: '大量輸血',
  plasmaSingleC: 'Plasma',
}

export const OBJECTIVE_LAYOUT = [
  {
    no: 1,
    title: '是否需住在負壓隔離病房',
    compactTitle: '負壓隔離病房',
    hint: undefined as string | undefined,
    rows: [{ key: 'negativePressureIsolation' as ObjectiveFactorKey, label: '負壓隔離病房' }],
  },
  {
    no: 2,
    title: '高呼吸器需求',
    hint: 'PEEP > 10 或 FiO₂ 約 ≥ 50% 即算',
    compactTitle: '高呼吸器需求',
    rows: [{ key: 'highVentilatorDemand' as ObjectiveFactorKey, label: '高呼吸器需求' }],
  },
  {
    no: 3,
    title: '藥物計數',
    compactTitle: '藥物計數',
    hint: undefined,
    rows: [
      { key: 'medicationTypeCount' as ObjectiveFactorKey, label: '藥物種類數' },
      { key: 'medicationFrequency' as ObjectiveFactorKey, label: '藥物使用頻率' },
    ],
  },
  {
    no: 4,
    title: '特殊檢查項目',
    compactTitle: '特殊檢查',
    hint: undefined,
    rows: [
      { key: 'crrtContinuousA' as ObjectiveFactorKey, label: 'CRRT', hint: '持續型 A' },
      { key: 'iabpContinuousB' as ObjectiveFactorKey, label: 'IABP', hint: '持續型 B' },
      { key: 'ecmoContinuousB' as ObjectiveFactorKey, label: 'ECMO', hint: '持續型 B' },
      { key: 'proneContinuousB' as ObjectiveFactorKey, label: 'PRONE', hint: '持續型 B' },
      { key: 'hypothermiaContinuousB' as ObjectiveFactorKey, label: '低溫治療', hint: '持續型 B' },
      { key: 'massiveTransfusionSingleC' as ObjectiveFactorKey, label: '大量輸血', hint: '單次 C' },
      { key: 'plasmaSingleC' as ObjectiveFactorKey, label: 'Plasma', hint: '單次 C' },
    ],
  },
] as const

export type BurdenFormRow = {
  assessmentId: string
  admissionId: string
  bedLabel: string
  diagnosis: string
  objective: Record<string, number>
  subjective: SubjectivePayload
  score: BurdenAssessment['score']
  status: BurdenAssessment['status']
}

export function assessmentToRow(assessment: BurdenAssessment): BurdenFormRow {
  return {
    assessmentId: assessment.assessmentId,
    admissionId: assessment.admissionId,
    bedLabel: assessment.bedLabel,
    diagnosis: assessment.diagnosis,
    objective: assessment.objective,
    subjective: assessment.subjective ?? defaultSubjective(),
    score: assessment.score,
    status: assessment.status,
  }
}

export function objectiveTotal(objective: Record<string, number>) {
  return Object.values(objective).reduce((sum, value) => sum + Number(value ?? 0), 0)
}

export function subjectiveTotal(subjective: SubjectivePayload) {
  const rass = subjective.rassScore
  let rassPoints = 0
  if (rass != null && !Number.isNaN(Number(rass))) {
    const abs = Math.abs(Number(rass))
    if (abs <= 1) rassPoints = 0
    else if (abs <= 3) rassPoints = 1
    else rassPoints = 2
  }
  return (
    rassPoints +
    (subjective.agitatedFallRisk ? 2 : 0) +
    (subjective.agitatedTubeRemovalRisk ? 2 : 0) +
    (subjective.drainageTube ? 2 : 0) +
    (subjective.tubeFeeding ? 2 : 0) +
    Number(subjective.dressingChangeFrequency ?? 0) +
    Number(subjective.vitalMonitoringFrequency ?? 0)
  )
}

export function getIncompleteFields(subjective: SubjectivePayload): string[] {
  return subjective.rassScore == null ? ['RASS 鎮靜分數'] : []
}
