import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
  type UniqueIdentifier,
} from '@dnd-kit/core'

export type AllocationContainers = Record<string, string[]>

export const UNASSIGNED_DROP_ID = 'unassigned'

export function isContainerDroppableId(id: UniqueIdentifier, nurseIds: string[]): boolean {
  const s = String(id)
  if (s === UNASSIGNED_DROP_ID) return true
  if (s.startsWith('lane:')) return true
  return nurseIds.includes(s)
}

export function buildContainers(
  unassigned: string[],
  byNurse: Record<string, string[]>,
  nurseIds: string[],
): AllocationContainers {
  const containers: AllocationContainers = { unassigned: [...unassigned] }
  for (const nid of nurseIds) containers[nid] = [...(byNurse[nid] ?? [])]
  return containers
}

export function normalizeOverId(overId: UniqueIdentifier, nurseIds: string[]): string {
  const id = String(overId)
  if (id === UNASSIGNED_DROP_ID) return 'unassigned'
  if (id.startsWith('lane:')) return id.slice(5)
  if (nurseIds.includes(id)) return id
  return id
}

export function findContainerForPatient(
  patientId: string,
  containers: AllocationContainers,
): string | null {
  for (const [key, list] of Object.entries(containers)) {
    if (list.includes(patientId)) return key
  }
  return null
}

export function resolveDropContainer(
  overId: UniqueIdentifier | undefined,
  activeId: string,
  containers: AllocationContainers,
  nurseIds: string[],
): string | null {
  if (!overId) return null
  if (String(overId) === String(activeId)) return null

  const normalized = normalizeOverId(overId, nurseIds)
  if (normalized === 'unassigned') return 'unassigned'
  if (nurseIds.includes(normalized)) return normalized
  return findContainerForPatient(normalized, containers)
}

export function createAllocationCollisionDetection(nurseIds: string[]): CollisionDetection {
  return (args) => {
    const activeId = String(args.active.id)

    const pointerCollisions = pointerWithin(args).filter((c) => String(c.id) !== activeId)

    const containerHits = pointerCollisions.filter((c) => isContainerDroppableId(c.id, nurseIds))
    if (containerHits.length > 0) {
      const unassignedHit = containerHits.find((c) => String(c.id) === UNASSIGNED_DROP_ID)
      if (unassignedHit) return [unassignedHit]
      return [containerHits[0]]
    }

    if (pointerCollisions.length > 0) return [pointerCollisions[0]]

    const cornerCollisions = closestCorners(args).filter((c) => String(c.id) !== activeId)
    const cornerContainer = cornerCollisions.find((c) => isContainerDroppableId(c.id, nurseIds))
    if (cornerContainer) return [cornerContainer]
    return cornerCollisions
  }
}

export function applyDragMove({
  activeId,
  overId,
  containers,
  nurseIds,
}: {
  activeId: string
  overId: UniqueIdentifier
  containers: AllocationContainers
  nurseIds: string[]
}): AllocationContainers | null {
  const fromKey = findContainerForPatient(activeId, containers)
  const toKey = resolveDropContainer(overId, activeId, containers, nurseIds)
  if (!fromKey || !toKey) return null

  const next = Object.fromEntries(
    Object.entries(containers).map(([k, v]) => [k, [...v]]),
  ) as AllocationContainers

  if (fromKey === toKey) {
    const list = next[fromKey]
    const normalized = normalizeOverId(overId, nurseIds)
    if (normalized === toKey) return null
    const oldIndex = list.indexOf(activeId)
    const newIndex = list.indexOf(normalized)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return null
    next[fromKey] = arrayMoveIds(list, oldIndex, newIndex)
    return next
  }

  const fromList = next[fromKey].filter((id) => id !== activeId)
  const toList = [...next[toKey].filter((id) => id !== activeId)]
  const normalized = normalizeOverId(overId, nurseIds)
  let insertIndex = toList.length
  if (normalized !== toKey) {
    const idx = toList.indexOf(normalized)
    insertIndex = idx === -1 ? toList.length : idx
  }
  toList.splice(insertIndex, 0, activeId)
  next[fromKey] = fromList
  next[toKey] = toList
  return next
}

function arrayMoveIds(list: string[], from: number, to: number): string[] {
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function containersToState(
  containers: AllocationContainers,
  nurseIds: string[],
): { unassigned: string[]; byNurse: Record<string, string[]> } {
  const byNurse = {} as Record<string, string[]>
  for (const nid of nurseIds) byNurse[nid] = containers[nid] ?? []
  return { unassigned: containers.unassigned ?? [], byNurse }
}

export function containersEqual(a: AllocationContainers, b: AllocationContainers): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    const la = a[k] ?? []
    const lb = b[k] ?? []
    if (la.length !== lb.length) return false
    for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) return false
  }
  return true
}
