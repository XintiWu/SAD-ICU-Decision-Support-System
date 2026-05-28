import {
  SIMULATION_BED_PATIENT,
  SIMULATION_NURSES,
  SIMULATION_PATIENT_MOCKS,
} from './patientSimulation'

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

export const NURSES: Record<NurseId, Nurse> = SIMULATION_NURSES

export const PATIENTS: Record<PatientId, Patient> = Object.fromEntries(
  SIMULATION_PATIENT_MOCKS.map((p) => [p.id, p]),
) as Record<PatientId, Patient>

export const INITIAL_UNASSIGNED: PatientId[] = []

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

export const SUGGESTED_UNASSIGNED: PatientId[] = []

export const SUGGESTED_BY_NURSE: Record<NurseId, PatientId[]> = {
  n1: ['p11', 'p12'],
  n2: ['p5', 'p3'],
  n3: ['p14', 'p7'],
  n4: ['p1', 'p9'],
  n5: ['p17', 'p13'],
  n6: ['p10', 'p16'],
  n7: ['p4', 'p8'],
  n8: ['p15', 'p6'],
  n9: ['p2'],
}

export const NEXT_UNASSIGNED: PatientId[] = []

export const NEXT_BY_NURSE: Record<NurseId, PatientId[]> = {
  n1: ['p7', 'p12'],
  n2: ['p2', 'p6'],
  n3: ['p3'],
  n4: ['p8'],
  n5: ['p1', 'p13'],
  n6: ['p4', 'p17'],
  n7: ['p10', 'p16'],
  n8: ['p11', 'p14'],
  n9: ['p15', 'p5'],
}

export const CURRENT_BED_PATIENT: Record<string, string> = { ...SIMULATION_BED_PATIENT }

export const NEXT_BED_PATIENT: Record<string, string> = {
  ...CURRENT_BED_PATIENT,
  'MI-02': 'MI-02 — Acute myocardial infarction',
  'MI-08': 'MI-08 — Cardiogenic Pulmonary Edema',
}
