import { PATIENTS, type NurseId, type PatientId } from '../../data/allocationMock'
import {
  getDemoPatients,
  getDemoStatOrders,
  type Patient as DemoPatient,
  type Sex,
} from '../../state/demoStore'

export type PatientTone = 'high' | 'mid' | 'low'
export type NurseLoadTone = 'high' | 'mid' | 'low'

export type EnrichedBed = {
  id: PatientId
  bedLabel: string
  bedShort: string
  diagnosis: string
  score: number
  tone: PatientTone
  badges: string[]
}

export type PatientDragDetail = EnrichedBed & {
  patientName: string
  sex: Sex
  age: number
  admittedAt: string
  attendingPhysician: string
}

export type NurseLoadRow = {
  nurseId: NurseId
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
  diffFromSuggested: number
  maxNurseId: NurseId | null
  minNurseId: NurseId | null
}

const demoByBed = () => {
  const map = new Map<string, DemoPatient>()
  for (const p of getDemoPatients()) map.set(p.bedLabel, p)
  return map
}

function bedKeyFromPatientId(pid: PatientId) {
  const m = PATIENTS[pid].label.match(/^床\s*(\d+)\b/)
  return m ? `床 ${m[1]}` : ''
}

export function formatBedShort(bedLabel: string) {
  const m = bedLabel.match(/床\s*(\d+)/)
  return m ? `${m[1]}床` : bedLabel
}

export function enrichBed(pid: PatientId): EnrichedBed {
  const mock = PATIENTS[pid]
  const bedKey = bedKeyFromPatientId(pid)
  const demo = demoByBed().get(bedKey)
  const m = mock.label.match(/^床\s*(\d+)\s*[—-]\s*(.+)$/)
  const diagnosis = demo?.diagnosis ?? (m ? m[2].trim() : mock.label)
  const bedLabel = bedKey || (m ? `床${m[1]}` : mock.label)

  const badges: string[] = []
  if (demo) {
    if (demo.objective['負壓隔離病房']) badges.push('隔離')
    if (demo.objective['高呼吸器需求']) badges.push('呼吸器')
    if (demo.objective['CRRT（持續型 A）']) badges.push('CRRT')
    if (demo.objective['ECMO（持續型 B）']) badges.push('ECMO')
    if (demo.objective['IABP（持續型 B）']) badges.push('IABP')
  }
  const statHit = getDemoStatOrders().some((o) => {
    const bm = o.bedLabel.match(/^床\s*(\d+)/)
    return bm && bedKey === `床 ${bm[1]}`
  })
  if (statHit) badges.push('STAT')

  return {
    id: pid,
    bedLabel,
    bedShort: formatBedShort(bedLabel),
    diagnosis,
    score: mock.score,
    tone: mock.tone,
    badges: badges.slice(0, 4),
  }
}

export function getPatientDragDetail(pid: PatientId): PatientDragDetail {
  const bed = enrichBed(pid)
  const demo = demoByBed().get(bedKeyFromPatientId(pid) || bed.bedLabel)
  return {
    ...bed,
    patientName: demo?.patientName ?? '—',
    sex: demo?.sex ?? '男',
    age: demo?.age ?? 0,
    admittedAt: demo?.admittedAt ?? '—',
    attendingPhysician: demo?.attendingPhysician ?? '—',
  }
}

export function sumLoad(ids: PatientId[]) {
  return ids.reduce((acc, id) => acc + PATIENTS[id].score, 0)
}

export function nurseLoadTone(load: number): NurseLoadTone {
  if (load >= 20) return 'high'
  if (load >= 14) return 'mid'
  return 'low'
}

export function computeLoads(byNurse: Record<NurseId, PatientId[]>, nurseIds: NurseId[]) {
  const loads = {} as Record<NurseId, number>
  const bedCounts = {} as Record<NurseId, number>
  for (const nid of nurseIds) {
    const ids = byNurse[nid] ?? []
    loads[nid] = sumLoad(ids)
    bedCounts[nid] = ids.length
  }
  return { loads, bedCounts }
}

export function computeStats(
  unassigned: PatientId[],
  byNurse: Record<NurseId, PatientId[]>,
  nurseIds: NurseId[],
  suggestedByNurse: Record<NurseId, PatientId[]>,
): AllocationStats {
  const { loads } = computeLoads(byNurse, nurseIds)
  const values = nurseIds.map((nid) => loads[nid] ?? 0)
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = nurseIds.length ? Math.round((sum / nurseIds.length) * 10) / 10 : 0
  const max = values.length ? Math.max(...values) : 0
  const min = values.length ? Math.min(...values) : 0
  let maxNurseId: NurseId | null = nurseIds[0] ?? null
  let minNurseId: NurseId | null = nurseIds[0] ?? null
  for (const nid of nurseIds) {
    if ((loads[nid] ?? 0) >= (loads[maxNurseId!] ?? 0)) maxNurseId = nid
    if ((loads[nid] ?? 0) <= (loads[minNurseId!] ?? 0)) minNurseId = nid
  }

  let diffFromSuggested = 0
  const currentOwner = invertAllocation(byNurse)
  const suggestedOwner = invertAllocation(suggestedByNurse)
  for (const pid of Object.keys(PATIENTS) as PatientId[]) {
    if (currentOwner.get(pid) !== suggestedOwner.get(pid)) diffFromSuggested += 1
  }

  return {
    unassignedCount: unassigned.length,
    avg,
    max,
    min,
    spread: max - min,
    diffFromSuggested,
    maxNurseId,
    minNurseId,
  }
}

export function buildNurseLoadRows(
  nurseIds: NurseId[],
  loads: Record<NurseId, number>,
  bedCounts: Record<NurseId, number>,
  avg: number,
): NurseLoadRow[] {
  return nurseIds
    .map((nurseId) => {
      const load = loads[nurseId] ?? 0
      return {
        nurseId,
        load,
        bedCount: bedCounts[nurseId] ?? 0,
        deltaFromAvg: Math.round((load - avg) * 10) / 10,
        tone: nurseLoadTone(load),
      }
    })
    .sort((a, b) => b.load - a.load)
}

export function invertAllocation(byNurse: Record<NurseId, PatientId[]>) {
  const out = new Map<PatientId, NurseId>()
  for (const [nid, pids] of Object.entries(byNurse) as [NurseId, PatientId[]][]) {
    for (const pid of pids) out.set(pid, nid)
  }
  return out
}

export function formatDelta(n: number) {
  if (n === 0) return '±0'
  return n > 0 ? `+${n}` : `${n}`
}

export const LOAD_BAR_MAX = 30
