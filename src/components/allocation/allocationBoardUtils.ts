import type { AllocationStats, NurseLoadRow } from './allocationUtils'
import { nurseLoadTone } from './allocationUtils'
import type { CatalogEntry } from './allocationApiState'
import { invertBoard } from './allocationApiState'
import { formatNurseDisplay } from '../../lib/nurseLabel'

export function computeBoardLoads(
  catalog: Map<string, CatalogEntry>,
  byNurse: Record<string, string[]>,
  nurseIds: string[],
) {
  const loads = {} as Record<string, number>
  const bedCounts = {} as Record<string, number>
  for (const nurseId of nurseIds) {
    const ids = byNurse[nurseId] ?? []
    loads[nurseId] = ids.reduce((sum, id) => sum + (catalog.get(id)?.score ?? 0), 0)
    bedCounts[nurseId] = ids.length
  }
  return { loads, bedCounts }
}

export function computeBoardStats(
  catalog: Map<string, CatalogEntry>,
  unassigned: string[],
  byNurse: Record<string, string[]>,
  nurseIds: string[],
  suggestedByNurse: Record<string, string[]>,
): AllocationStats {
  const { loads } = computeBoardLoads(catalog, byNurse, nurseIds)
  const values = nurseIds.map((id) => loads[id] ?? 0)
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = nurseIds.length ? Math.round((sum / nurseIds.length) * 10) / 10 : 0
  const max = values.length ? Math.max(...values) : 0
  const min = values.length ? Math.min(...values) : 0
  let maxNurseId: string | null = nurseIds[0] ?? null
  let minNurseId: string | null = nurseIds[0] ?? null
  for (const nurseId of nurseIds) {
    if ((loads[nurseId] ?? 0) >= (loads[maxNurseId!] ?? 0)) maxNurseId = nurseId
    if ((loads[nurseId] ?? 0) <= (loads[minNurseId!] ?? 0)) minNurseId = nurseId
  }

  const currentOwner = invertBoard(byNurse)
  const suggestedOwner = invertBoard(suggestedByNurse)
  let diffFromSuggested = 0
  for (const admissionId of catalog.keys()) {
    if (currentOwner.get(admissionId) !== suggestedOwner.get(admissionId)) diffFromSuggested += 1
  }

  return {
    unassignedCount: unassigned.length,
    avg,
    max,
    min,
    spread: max - min,
    diffFromSuggested,
    maxNurseId: maxNurseId as AllocationStats['maxNurseId'],
    minNurseId: minNurseId as AllocationStats['minNurseId'],
  }
}

export function buildBoardLoadRows(
  nurseIds: string[],
  loads: Record<string, number>,
  bedCounts: Record<string, number>,
  avg: number,
): NurseLoadRow[] {
  return nurseIds
    .map((nurseId) => {
      const load = loads[nurseId] ?? 0
      return {
        nurseId: nurseId as NurseLoadRow['nurseId'],
        load,
        bedCount: bedCounts[nurseId] ?? 0,
        deltaFromAvg: Math.round((load - avg) * 10) / 10,
        tone: nurseLoadTone(load),
      }
    })
    .sort((a, b) => b.load - a.load)
}

export function nurseNamesFromRows(
  nurses: Array<{ id: string; shortName: string; role?: string }>,
  chargeNurseId?: string | null,
) {
  return Object.fromEntries(
    nurses.map((n) => [
      n.id,
      formatNurseDisplay(n.shortName, { nurseId: n.id, chargeNurseId, role: n.role }),
    ]),
  )
}
