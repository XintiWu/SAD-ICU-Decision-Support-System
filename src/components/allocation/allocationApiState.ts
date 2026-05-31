import type { AllocationPatient, AllocationRun, ApiAdmission, BurdenAssessment } from '../../api/client'
import type { EnrichedBed, PatientDragDetail } from './allocationUtils'
import { formatBedShort } from './allocationUtils'
import { buildBurdenDetailLines, scoreToTone } from '../../lib/burdenDisplay'

export type CatalogEntry = PatientDragDetail

export function buildPatientCatalog(admissions: ApiAdmission[]): Map<string, CatalogEntry> {
  const catalog = new Map<string, CatalogEntry>()
  for (const admission of admissions) {
    catalog.set(admission.admissionId, admissionToCatalogEntry(admission, 0, 'low'))
  }
  return catalog
}

export function mergeRunPatients(catalog: Map<string, CatalogEntry>, patients: AllocationPatient[]) {
  for (const patient of patients) {
    const prev = catalog.get(patient.admissionId)
    catalog.set(patient.admissionId, {
      id: patient.admissionId,
      bedLabel: patient.bedLabel,
      bedShort: formatBedShort(patient.bedLabel),
      diagnosis: patient.diagnosis,
      score: patient.score,
      tone: patient.tone,
      badges: prev?.badges ?? [],
      patientName: patient.patientName,
      sex: prev?.sex ?? '男',
      age: prev?.age ?? 0,
      admittedAt: prev?.admittedAt ?? '—',
      attendingPhysician: prev?.attendingPhysician ?? '—',
      burdenLines: prev?.burdenLines,
      objectiveTotal: prev?.objectiveTotal,
      subjectiveTotal: prev?.subjectiveTotal,
    })
  }
}

function admissionToCatalogEntry(
  admission: ApiAdmission,
  score: number,
  tone: EnrichedBed['tone'],
): CatalogEntry {
  return {
    id: admission.admissionId,
    bedLabel: admission.bedLabel,
    bedShort: formatBedShort(admission.bedLabel),
    diagnosis: admission.diagnosis,
    score,
    tone,
    badges: [],
    patientName: admission.patientName,
    sex: admission.sex,
    age: admission.age,
    admittedAt: admission.admittedAt.slice(0, 10),
    attendingPhysician: admission.attendingPhysician,
  }
}

export type BoardState = {
  unassigned: string[]
  byNurse: Record<string, string[]>
}

export function emptyBoardState(admissionIds: string[], nurseIds: string[]): BoardState {
  const byNurse = Object.fromEntries(nurseIds.map((id) => [id, [] as string[]]))
  return { unassigned: [...admissionIds], byNurse }
}

export function runToBoardState(run: AllocationRun, nurseIds: string[]): BoardState {
  const byNurse = Object.fromEntries(nurseIds.map((id) => [id, [] as string[]]))
  for (const row of run.byNurse) {
    if (byNurse[row.nurseId]) {
      byNurse[row.nurseId] = row.patients.map((p: AllocationPatient) => p.admissionId)
    }
  }
  return {
    unassigned: run.unassigned.map((p: AllocationPatient) => p.admissionId),
    byNurse,
  }
}

export function invertBoard(byNurse: Record<string, string[]>) {
  const out = new Map<string, string>()
  for (const [nurseId, ids] of Object.entries(byNurse)) {
    for (const admissionId of ids) out.set(admissionId, nurseId)
  }
  return out
}

export type AllocationItemPayload = {
  admissionId: string
  nurseId: string
  sortOrder: number
  isManualOverride: boolean
}

export function boardStateToItems(
  byNurse: Record<string, string[]>,
  suggestedOwner: Map<string, string>,
): AllocationItemPayload[] {
  const items: AllocationItemPayload[] = []
  for (const [nurseId, admissionIds] of Object.entries(byNurse)) {
    admissionIds.forEach((admissionId, index) => {
      items.push({
        admissionId,
        nurseId,
        sortOrder: index + 1,
        isManualOverride: suggestedOwner.get(admissionId) !== nurseId,
      })
    })
  }
  return items
}

export function applyRunToCatalog(catalog: Map<string, CatalogEntry>, run: AllocationRun) {
  for (const row of run.byNurse) mergeRunPatients(catalog, row.patients)
  mergeRunPatients(catalog, run.unassigned)
}

export function mergeBurdenIntoCatalog(catalog: Map<string, CatalogEntry>, assessments: BurdenAssessment[]) {
  for (const assessment of assessments) {
    const prev = catalog.get(assessment.admissionId)
    if (!prev) continue
    catalog.set(assessment.admissionId, {
      ...prev,
      score: assessment.score.totalScore,
      tone: scoreToTone(assessment.score.totalScore),
      burdenLines: buildBurdenDetailLines(assessment),
      objectiveTotal: assessment.score.objectiveTotal,
      subjectiveTotal: assessment.score.subjectiveTotal,
    })
  }
}
