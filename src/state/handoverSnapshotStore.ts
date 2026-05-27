import { NURSES, PATIENTS, type NurseId, type PatientId } from '../data/allocationMock'
import {
  getAllocationByNurse,
  getAllocationUnassigned,
  getCurrentShift,
  getDemoPatients,
  getDemoStatOrders,
  getDemoTasks,
  getOnDutyCharge,
  taskPoints,
  type Patient,
  type ShiftKey,
  type Task,
} from './demoStore'

const STORAGE_KEY = 'icu-handover-snapshots-v1'

const SHIFT_LABELS: Record<ShiftKey, string> = {
  day: '白班 06:00–14:00',
}

export type HandoverSnapshotSummary = {
  patientCount: number
  nurseCount: number
  statTotal?: number
  taskTotal: number
  taskOpen: number
  taskUrgentOpen: number
  avgLoad: number
  maxLoad: number
}

export type HandoverSnapshotNurseBlock = {
  nurseId: NurseId
  nurseName: string
  load: number
  beds: Array<{
    patientId: PatientId
    bedLabel: string
    label: string
    score: number
    tone: 'high' | 'mid' | 'low'
  }>
}

export type HandoverSnapshot = {
  id: string
  createdAt: string
  shift: ShiftKey
  shiftLabel: string
  createdBy: string
  note?: string
  summary: HandoverSnapshotSummary
  allocation: {
    byNurse: Record<NurseId, PatientId[]>
    unassigned: PatientId[]
    loads: Record<NurseId, number>
  }
  patients: Patient[]
  tasks: Task[]
  nurseBlocks: HandoverSnapshotNurseBlock[]
}

export type HandoverSnapshotListItem = Pick<
  HandoverSnapshot,
  'id' | 'createdAt' | 'shift' | 'shiftLabel' | 'createdBy' | 'note' | 'summary'
>

type StoredPayload = { version: 1; snapshots: HandoverSnapshot[] }

const listeners = new Set<() => void>()

// useSyncExternalStore 需要穩定的 snapshot 參考；每次 map/sort 會造成無限 re-render
let memorySnapshots: HandoverSnapshot[] = []
let memoryListItems: HandoverSnapshotListItem[] = []

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribeHandoverSnapshots(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readAllFromStorage(): HandoverSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredPayload
    if (parsed?.version !== 1 || !Array.isArray(parsed.snapshots)) return []
    return parsed.snapshots
  } catch {
    return []
  }
}

function buildListItems(snapshots: HandoverSnapshot[]): HandoverSnapshotListItem[] {
  return snapshots
    .map(({ id, createdAt, shift, shiftLabel, createdBy, note, summary }) => ({
      id,
      createdAt,
      shift,
      shiftLabel,
      createdBy,
      note,
      summary,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function syncMemoryFromStorage() {
  memorySnapshots = readAllFromStorage()
  memoryListItems = buildListItems(memorySnapshots)
}

function writeAll(snapshots: HandoverSnapshot[]) {
  const payload: StoredPayload = { version: 1, snapshots }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  memorySnapshots = snapshots
  memoryListItems = buildListItems(snapshots)
  emit()
}

syncMemoryFromStorage()

function seedDemoSnapshotIfEmpty() {
  if (localStorage.getItem(STORAGE_KEY)) return
  if (memorySnapshots.length > 0) return
  const snapshot = captureHandoverSnapshot()
  snapshot.createdAt = '2026-05-27T06:35:00.000+08:00'
  writeAll([snapshot])
}

seedDemoSnapshotIfEmpty()

export function getLatestPublishedAllocationMeta(): Pick<
  HandoverSnapshotListItem,
  'createdAt' | 'createdBy' | 'shiftLabel'
> | null {
  const latest = memoryListItems[0]
  if (!latest) return null
  return {
    createdAt: latest.createdAt,
    createdBy: latest.createdBy,
    shiftLabel: latest.shiftLabel,
  }
}

function computeLoads(byNurse: Record<NurseId, PatientId[]>) {
  const sum = (ids: PatientId[]) => ids.reduce((acc, id) => acc + (PATIENTS[id]?.score ?? 0), 0)
  const loads = {} as Record<NurseId, number>
  for (const nid of Object.keys(NURSES) as NurseId[]) {
    loads[nid] = sum(byNurse[nid] ?? [])
  }
  return loads
}

function buildNurseBlocks(
  byNurse: Record<NurseId, PatientId[]>,
  loads: Record<NurseId, number>,
): HandoverSnapshotNurseBlock[] {
  return (Object.keys(NURSES) as NurseId[])
    .map((nurseId) => ({
      nurseId,
      nurseName: NURSES[nurseId].shortName,
      load: loads[nurseId] ?? 0,
      beds: (byNurse[nurseId] ?? []).map((patientId) => {
        const p = PATIENTS[patientId]
        return {
          patientId,
          bedLabel: p?.label.match(/^床\s*\d+/)?.[0] ?? p?.label ?? patientId,
          label: p?.label ?? patientId,
          score: p?.score ?? 0,
          tone: p?.tone ?? 'low',
        }
      }),
    }))
    .filter((b) => b.beds.length > 0)
    .sort((a, b) => b.load - a.load)
}

export function captureHandoverSnapshot(note?: string): HandoverSnapshot {
  const shift = getCurrentShift()
  const byNurse = structuredClone(getAllocationByNurse())
  const unassigned = structuredClone(getAllocationUnassigned())
  const loads = computeLoads(byNurse)
  const patients = structuredClone(getDemoPatients())
  const tasks = structuredClone(getDemoTasks())
  const statTotal = getDemoStatOrders().length

  const loadValues = Object.values(loads)
  const avgLoad =
    loadValues.length > 0
      ? Math.round((loadValues.reduce((a, b) => a + b, 0) / loadValues.length) * 10) / 10
      : 0
  const maxLoad = loadValues.length ? Math.max(...loadValues) : 0

  const taskOpen = tasks.filter((t) => !t.done).length
  const taskUrgentOpen = tasks.filter((t) => !t.done && t.urgent).length
  const now = new Date()
  return {
    id: `${now.getTime().toString(16)}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: now.toISOString(),
    shift,
    shiftLabel: SHIFT_LABELS[shift],
    createdBy: getOnDutyCharge(),
    note: note?.trim() || undefined,
    summary: {
      patientCount: patients.length,
      nurseCount: (Object.keys(byNurse) as NurseId[]).filter((nid) => (byNurse[nid]?.length ?? 0) > 0).length,
      statTotal,
      taskTotal: tasks.length,
      taskOpen,
      taskUrgentOpen,
      avgLoad,
      maxLoad,
    },
    allocation: { byNurse, unassigned, loads },
    patients,
    tasks,
    nurseBlocks: buildNurseBlocks(byNurse, loads),
  }
}

export function saveHandoverSnapshot(note?: string): HandoverSnapshot {
  const snapshot = captureHandoverSnapshot(note)
  const next = [snapshot, ...memorySnapshots]
  writeAll(next)
  return snapshot
}

export function listHandoverSnapshots(): HandoverSnapshotListItem[] {
  return memoryListItems
}

export function getHandoverSnapshot(id: string): HandoverSnapshot | null {
  return memorySnapshots.find((s) => s.id === id) ?? null
}

export function deleteHandoverSnapshot(id: string) {
  writeAll(memorySnapshots.filter((s) => s.id !== id))
}

export function formatSnapshotDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function openTasksFromSnapshot(snapshot: HandoverSnapshot) {
  return snapshot.tasks.filter((t) => !t.done)
}

export function taskLoadPoints(t: Task) {
  return taskPoints(t)
}
