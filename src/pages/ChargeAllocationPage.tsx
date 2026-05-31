import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AllocationDragPatientPanel } from '../components/allocation/AllocationDragPatientPanel'
import { AllocationNurseLane } from '../components/allocation/AllocationNurseLane'
import { AllocationUnassignedStrip } from '../components/allocation/AllocationUnassignedStrip'
import { AllocationBedChip } from '../components/allocation/AllocationBedChip'
import { AllocationSidebar } from '../components/allocation/AllocationSidebar'
import { ConfirmAllocationDialog } from '../components/allocation/ConfirmAllocationDialog'
import {
  buildNurseLoadRows,
  buildPatientDragDetail,
  computeLoads,
  computeStats,
} from '../components/allocation/allocationUtils'
import type { PatientDragDetail } from '../components/allocation/allocationUtils'
import {
  applyDragMove,
  buildContainers,
  containersEqual,
  containersToState,
  createAllocationCollisionDetection,
  isContainerDroppableId,
  resolveDropContainer,
} from '../components/allocation/allocationDnd'
import { useDragAutoScroll } from '../components/allocation/useDragAutoScroll'
import { apiGet, apiPost, apiPut, CHARGE_USER_ID, type AllocationRun, type AllocationPatient, type ApiAdmission } from '../api/client'
import { useShift } from '../context/ShiftContext'

export function ChargeAllocationPage() {
  const navigate = useNavigate()
  const { shiftId } = useShift()

  const [allocationRunId, setAllocationRunId] = useState<string | null>(null)
  const [nurseIds, setNurseIds] = useState<string[]>([])
  const [nurseNames, setNurseNames] = useState<Record<string, string>>({})
  const [patientMap, setPatientMap] = useState<Record<string, PatientDragDetail>>({})
  const [unassigned, setUnassigned] = useState<string[]>([])
  const [byNurse, setByNurse] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [undoStack, setUndoStack] = useState<Array<{ unassigned: string[]; byNurse: Record<string, string[]> }>>([])

  const boardRef = useRef<HTMLDivElement>(null)
  const laneBodiesRef = useRef(new Map<string, HTMLElement>())
  const stateRef = useRef({ unassigned, byNurse })
  useEffect(() => { stateRef.current = { unassigned, byNurse } }, [unassigned, byNurse])
  const lastOverRef = useRef<UniqueIdentifier | null>(null)
  const lastContainerOverRef = useRef<UniqueIdentifier | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const collisionDetection = useMemo(() => createAllocationCollisionDetection(nurseIds), [nurseIds])

  useDragAutoScroll({ active: activeId != null, boardRef, laneBodyRefs: laneBodiesRef })

  const registerLaneBody = useCallback((laneId: string, el: HTMLDivElement | null) => {
    if (el) laneBodiesRef.current.set(laneId, el)
    else laneBodiesRef.current.delete(laneId)
  }, [])

  useEffect(() => {
    loadAllocation()
  }, [shiftId])

  async function loadAllocation() {
    setLoading(true)
    setError(null)
    try {
      const [admissions, run] = await Promise.all([
        apiGet<ApiAdmission[]>(`/admissions?shiftId=${shiftId}&status=active`),
        apiPost<AllocationRun>(
          '/allocation-runs/suggest',
          { shiftId, targetShiftId: shiftId },
          { userId: CHARGE_USER_ID },
        ),
      ])
      const admMap: Record<string, ApiAdmission> = {}
      for (const a of admissions) admMap[a.admissionId] = a
      applyRun(run, admMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setLoading(false)
    }
  }

  function applyRun(run: AllocationRun, admMap: Record<string, ApiAdmission> = {}) {
    setAllocationRunId(run.allocationRunId)
    const ids = run.byNurse.map((n) => n.nurseId)
    setNurseIds(ids)
    const names: Record<string, string> = {}
    for (const n of run.byNurse) names[n.nurseId] = n.shortName
    setNurseNames(names)

    const pmap: Record<string, PatientDragDetail> = {}
    const allPatients: AllocationPatient[] = [
      ...run.unassigned,
      ...run.byNurse.flatMap((n) => n.patients),
    ]
    for (const p of allPatients) pmap[p.admissionId] = buildPatientDragDetail(p, admMap[p.admissionId])
    setPatientMap((prev) => ({ ...prev, ...pmap }))

    setUnassigned(run.unassigned.map((p) => p.admissionId))
    const bn: Record<string, string[]> = {}
    for (const n of run.byNurse) bn[n.nurseId] = n.patients.map((p) => p.admissionId)
    setByNurse(bn)
    setUndoStack([])
  }

  async function applySuggested() {
    setLoading(true)
    setError(null)
    try {
      const admissions = await apiGet<ApiAdmission[]>(`/admissions?shiftId=${shiftId}&status=active`)
      const admMap: Record<string, ApiAdmission> = {}
      for (const a of admissions) admMap[a.admissionId] = a
      const run = await apiPost<AllocationRun>(
        '/allocation-runs/suggest',
        { shiftId, targetShiftId: shiftId },
        { userId: CHARGE_USER_ID },
      )
      applyRun(run, admMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : '取得建議失敗')
    } finally {
      setLoading(false)
    }
  }

  function getPatients(ids: string[]): PatientDragDetail[] {
    return ids.flatMap((id) => (patientMap[id] ? [patientMap[id]] : []))
  }

  function pushUndo() {
    const { unassigned: u, byNurse: b } = stateRef.current
    setUndoStack((s) => [...s.slice(-12), { unassigned: [...u], byNurse: { ...b } }])
  }

  function handleUndo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUnassigned(prev.unassigned)
    setByNurse(prev.byNurse)
    setUndoStack((s) => s.slice(0, -1))
    if (allocationRunId) saveItems(allocationRunId, prev.byNurse)
  }

  function saveItems(runId: string, bn: Record<string, string[]>) {
    const items = nurseIds.flatMap((nid) =>
      (bn[nid] ?? []).map((admissionId, i) => ({
        admissionId,
        nurseId: nid,
        sortOrder: i + 1,
        isManualOverride: true,
      })),
    )
    apiPut(`/allocation-runs/${runId}/items`, { items }, { userId: CHARGE_USER_ID }).catch(() => {})
  }

  async function handleConfirm() {
    if (!allocationRunId) return
    try {
      await apiPost(`/allocation-runs/${allocationRunId}/confirm`, {}, { userId: CHARGE_USER_ID })
      setConfirmOpen(false)
      navigate('/leader/allocation-result', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '確認失敗')
      setConfirmOpen(false)
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
    lastOverRef.current = null
    lastContainerOverRef.current = null
  }

  function onDragOver(e: DragOverEvent) {
    const overId = e.over?.id
    if (!overId) return
    lastOverRef.current = overId
    if (isContainerDroppableId(overId, nurseIds)) lastContainerOverRef.current = overId
  }

  function onDragEnd(e: DragEndEvent) {
    const activePid = e.active.id as string
    setActiveId(null)

    let overId = e.over?.id ?? lastOverRef.current
    if (!overId) return
    if (String(overId) === activePid) overId = lastContainerOverRef.current
    if (!overId) return

    const { unassigned: u, byNurse: b } = stateRef.current
    const containers = buildContainers(u, b, nurseIds)
    const toKey = resolveDropContainer(overId, activePid, containers, nurseIds)
    if (!toKey) return

    const next = applyDragMove({ activeId: activePid, overId, containers, nurseIds })
    if (!next || containersEqual(next, containers)) return

    pushUndo()
    const { unassigned: nu, byNurse: nb } = containersToState(next, nurseIds)
    setUnassigned(nu)
    setByNurse(nb)
    lastOverRef.current = null
    lastContainerOverRef.current = null
    if (allocationRunId) saveItems(allocationRunId, nb)
  }

  function onDragCancel() {
    setActiveId(null)
    lastOverRef.current = null
    lastContainerOverRef.current = null
  }

  const { loads, bedCounts } = useMemo(
    () => computeLoads(byNurse, nurseIds, patientMap),
    [byNurse, nurseIds, patientMap],
  )
  const stats = useMemo(
    () => computeStats(unassigned, byNurse, nurseIds, nurseNames, patientMap),
    [unassigned, byNurse, nurseIds, nurseNames, patientMap],
  )
  const loadRows = useMemo(
    () => buildNurseLoadRows(nurseIds, loads, bedCounts, stats.avg, nurseNames),
    [nurseIds, loads, bedCounts, stats.avg, nurseNames],
  )

  const totalBeds = unassigned.length + nurseIds.reduce((s, nid) => s + (byNurse[nid]?.length ?? 0), 0)
  const activePatient = activeId ? patientMap[activeId] ?? null : null

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl bg-white ring-1 ring-black/10">
        <span className="text-sm font-semibold text-slate-500">載入分床資料中…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-[#ffe8e1] p-5 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">
        {error}
        <button onClick={loadAllocation} className="ml-3 underline text-sm">重試</button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <section className="flex min-h-[calc(100dvh-6.5rem)] flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="relative min-h-0 flex-1 rounded-2xl bg-white ring-1 ring-black/10">
            <div
              ref={boardRef}
              className={[
                'max-h-[calc(100dvh-7.5rem)] min-h-[360px] space-y-3 overflow-y-auto p-4',
                activeId ? 'pb-20' : 'pb-4',
              ].join(' ')}
            >
              <AllocationUnassignedStrip
                items={getPatients(unassigned)}
                activePatientId={activeId}
                onSuggest={applySuggested}
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {nurseIds.map((nid) => {
                  const row = loadRows.find((r) => r.nurseId === nid)
                  return (
                    <AllocationNurseLane
                      key={nid}
                      id={nid}
                      title={nurseNames[nid] ?? nid}
                      items={getPatients(byNurse[nid] ?? [])}
                      load={loads[nid]}
                      bedCount={bedCounts[nid]}
                      loadTone={row?.tone}
                      activePatientId={activeId}
                      onRegisterBody={registerLaneBody}
                    />
                  )
                })}
              </div>
            </div>
            {activePatient ? <AllocationDragPatientPanel patient={activePatient} /> : null}
          </div>

          <DragOverlay dropAnimation={null}>
            {activePatient ? <AllocationBedChip bed={activePatient} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </section>

      <AllocationSidebar
        stats={stats}
        loadRows={loadRows}
        canUndo={undoStack.length > 0}
        onUndo={handleUndo}
        onConfirm={() => setConfirmOpen(true)}
      />

      {confirmOpen ? (
        <ConfirmAllocationDialog
          stats={stats}
          totalBeds={totalBeds}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  )
}
