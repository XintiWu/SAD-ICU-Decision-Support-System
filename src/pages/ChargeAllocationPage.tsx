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
  computeLoads,
  computeStats,
  enrichBed,
  getPatientDragDetail,
} from '../components/allocation/allocationUtils'
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
import { NURSES, PATIENTS, SUGGESTED_BY_NURSE, SUGGESTED_UNASSIGNED } from '../data/allocationMock'
import type { NurseId, PatientId } from '../data/allocationMock'
import {
  getAllocationByNurse,
  getAllocationUnassigned,
  setAllocationByNurse,
  setAllocationUnassigned,
} from '../state/demoStore'
import { saveHandoverSnapshot } from '../state/handoverSnapshotStore'

type AllocationSnapshot = {
  unassigned: PatientId[]
  byNurse: Record<NurseId, PatientId[]>
}

export function ChargeAllocationPage() {
  const navigate = useNavigate()
  const nurseIds = useMemo(() => Object.keys(NURSES) as NurseId[], [])
  const totalBeds = useMemo(() => Object.keys(PATIENTS).length, [])

  const [unassigned, setUnassigned] = useState<PatientId[]>(() => [...getAllocationUnassigned()])
  const [byNurse, setByNurse] = useState<Record<NurseId, PatientId[]>>(() => ({ ...getAllocationByNurse() }))
  const [undoStack, setUndoStack] = useState<AllocationSnapshot[]>([])
  const [activeId, setActiveId] = useState<PatientId | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const boardRef = useRef<HTMLDivElement>(null)
  const laneBodiesRef = useRef(new Map<string, HTMLElement>())
  const allocationRef = useRef({ unassigned, byNurse })
  useEffect(() => {
    allocationRef.current = { unassigned, byNurse }
  }, [unassigned, byNurse])
  const lastOverRef = useRef<UniqueIdentifier | null>(null)
  const lastContainerOverRef = useRef<UniqueIdentifier | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const collisionDetection = useMemo(() => createAllocationCollisionDetection(nurseIds), [nurseIds])

  const { loads, bedCounts } = useMemo(() => computeLoads(byNurse, nurseIds), [byNurse, nurseIds])
  const stats = useMemo(
    () => computeStats(unassigned, byNurse, nurseIds, SUGGESTED_BY_NURSE),
    [unassigned, byNurse, nurseIds],
  )
  const loadRows = useMemo(
    () => buildNurseLoadRows(nurseIds, loads, bedCounts, stats.avg),
    [nurseIds, loads, bedCounts, stats.avg],
  )

  useDragAutoScroll({
    active: activeId != null,
    boardRef,
    laneBodyRefs: laneBodiesRef,
  })

  const registerLaneBody = useCallback((laneId: string, el: HTMLDivElement | null) => {
    if (el) laneBodiesRef.current.set(laneId, el)
    else laneBodiesRef.current.delete(laneId)
  }, [])

  function pushUndoFromRef() {
    const { unassigned: u, byNurse: b } = allocationRef.current
    setUndoStack((s) => [...s.slice(-12), { unassigned: [...u], byNurse: { ...b } }])
  }

  function applySnapshot(next: AllocationSnapshot) {
    setUnassigned(next.unassigned)
    setByNurse(next.byNurse)
    setAllocationUnassigned(next.unassigned)
    setAllocationByNurse(next.byNurse)
  }

  function applyContainers(containers: ReturnType<typeof buildContainers>) {
    const { unassigned: u, byNurse: b } = containersToState(containers, nurseIds)
    setUnassigned(u)
    setByNurse(b)
    setAllocationUnassigned(u)
    setAllocationByNurse(b)
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as PatientId)
    lastOverRef.current = null
    lastContainerOverRef.current = null
  }

  function onDragOver(e: DragOverEvent) {
    const overId = e.over?.id
    if (!overId) return
    lastOverRef.current = overId
    if (isContainerDroppableId(overId, nurseIds)) {
      lastContainerOverRef.current = overId
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const activePid = e.active.id as PatientId
    setActiveId(null)

    let overId = e.over?.id ?? lastOverRef.current
    if (!overId) return

    if (String(overId) === String(activePid)) {
      overId = lastContainerOverRef.current
    }
    if (!overId) return

    const containers = buildContainers(allocationRef.current.unassigned, allocationRef.current.byNurse, nurseIds)
    const toKey = resolveDropContainer(overId, activePid, containers, nurseIds)
    if (!toKey) return

    const next = applyDragMove({ activeId: activePid, overId, containers, nurseIds })
    if (!next || containersEqual(next, containers)) return

    pushUndoFromRef()
    applyContainers(next)
    lastOverRef.current = null
    lastContainerOverRef.current = null
  }

  function onDragCancel() {
    setActiveId(null)
    lastOverRef.current = null
    lastContainerOverRef.current = null
  }

  function applySuggested() {
    pushUndoFromRef()
    setUnassigned([...SUGGESTED_UNASSIGNED])
    setByNurse({ ...SUGGESTED_BY_NURSE })
    setAllocationUnassigned([...SUGGESTED_UNASSIGNED])
    setAllocationByNurse({ ...SUGGESTED_BY_NURSE })
  }

  function handleUndo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    applySnapshot(prev)
    setUndoStack((s) => s.slice(0, -1))
  }

  function handleConfirm() {
    saveHandoverSnapshot()
    setConfirmOpen(false)
    navigate('/leader/allocation-result', { replace: true })
  }

  const activeBed = activeId ? enrichBed(activeId) : null
  const activePatient = activeId ? getPatientDragDetail(activeId) : null

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
                items={unassigned}
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
                      title={NURSES[nid].shortName}
                      items={byNurse[nid] ?? []}
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
            {activeBed ? <AllocationBedChip bed={activeBed} overlay /> : null}
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
