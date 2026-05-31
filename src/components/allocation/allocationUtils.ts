import type { AllocationPatient, ApiAdmission } from '../../api/client'

export type PatientTone = 'high' | 'mid' | 'low'
export type NurseLoadTone = 'high' | 'mid' | 'low'

export type EnrichedBed = {
  id: string
  bedLabel: string
  bedShort: string
  diagnosis: string
  score: number
  tone: PatientTone
  badges: string[]
}

export type PatientDragDetail = EnrichedBed & {
  patientName: string
  sex: '男' | '女'
  age: number
  admittedAt: string
  attendingPhysician: string
}

export type NurseLoadRow = {
  nurseId: string
  shortName: string
  load: number
  bedCount: number
  deltaFromAvg: number
  tone: NurseLoadTone
}

export type AllocationStats = {
  unassignedCount: number
  avg: number
  max: number
  min: number
  spread: number
  maxNurseId: string | null
  maxNurseName: string
  minNurseId: string | null
  minNurseName: string
}

export function formatBedShort(bedLabel: string) {
  const m = bedLabel.match(/\d+/)
  return m ? `${m[0]}床` : bedLabel
}

export function buildPatientDragDetail(
  patient: AllocationPatient,
  admission?: ApiAdmission,
): PatientDragDetail {
  return {
    id: patient.admissionId,
    bedLabel: patient.bedLabel,
    bedShort: formatBedShort(patient.bedLabel),
    diagnosis: patient.diagnosis,
    score: patient.score,
    tone: patient.tone,
    badges: [],
    patientName: patient.patientName,
    sex: admission?.sex ?? '男',
    age: admission?.age ?? 0,
    admittedAt: admission?.admittedAt ? admission.admittedAt.split('T')[0] : '—',
    attendingPhysician: admission?.attendingPhysician ?? '—',
  }
}

export function nurseLoadTone(load: number): NurseLoadTone {
  if (load >= 20) return 'high'
  if (load >= 14) return 'mid'
  return 'low'
}

export function computeLoads(
  byNurse: Record<string, string[]>,
  nurseIds: string[],
  patientMap: Record<string, { score: number }>,
) {
  const loads = {} as Record<string, number>
  const bedCounts = {} as Record<string, number>
  for (const nid of nurseIds) {
    const ids = byNurse[nid] ?? []
    loads[nid] = ids.reduce((sum, id) => sum + (patientMap[id]?.score ?? 0), 0)
    bedCounts[nid] = ids.length
  }
  return { loads, bedCounts }
}

export function computeStats(
  unassigned: string[],
  byNurse: Record<string, string[]>,
  nurseIds: string[],
  nurseNames: Record<string, string>,
  patientMap: Record<string, { score: number }>,
): AllocationStats {
  const { loads } = computeLoads(byNurse, nurseIds, patientMap)
  const values = nurseIds.map((nid) => loads[nid] ?? 0)
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = nurseIds.length ? Math.round((sum / nurseIds.length) * 10) / 10 : 0
  const max = values.length ? Math.max(...values) : 0
  const min = values.length ? Math.min(...values) : 0
  let maxNurseId: string | null = nurseIds[0] ?? null
  let minNurseId: string | null = nurseIds[0] ?? null
  for (const nid of nurseIds) {
    if ((loads[nid] ?? 0) >= (loads[maxNurseId!] ?? 0)) maxNurseId = nid
    if ((loads[nid] ?? 0) <= (loads[minNurseId!] ?? 0)) minNurseId = nid
  }
  return {
    unassignedCount: unassigned.length,
    avg,
    max,
    min,
    spread: max - min,
    maxNurseId,
    maxNurseName: maxNurseId ? (nurseNames[maxNurseId] ?? '—') : '—',
    minNurseId,
    minNurseName: minNurseId ? (nurseNames[minNurseId] ?? '—') : '—',
  }
}

export function buildNurseLoadRows(
  nurseIds: string[],
  loads: Record<string, number>,
  bedCounts: Record<string, number>,
  avg: number,
  nurseNames: Record<string, string>,
): NurseLoadRow[] {
  return nurseIds
    .map((nurseId) => {
      const load = loads[nurseId] ?? 0
      return {
        nurseId,
        shortName: nurseNames[nurseId] ?? '—',
        load,
        bedCount: bedCounts[nurseId] ?? 0,
        deltaFromAvg: Math.round((load - avg) * 10) / 10,
        tone: nurseLoadTone(load),
      }
    })
    .sort((a, b) => b.load - a.load)
}

export const LOAD_BAR_MAX = 30

export function formatDelta(n: number) {
  if (n === 0) return '±0'
  return n > 0 ? `+${n}` : `${n}`
}
