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
import {
  apiGet,
  apiPost,
  apiPut,
  CHARGE_USER_ID,
  type AllocationRun,
  type ApiAdmission,
  type ApiNurse,
} from '../api/client'
import { AllocationDragPatientPanel } from '../components/allocation/AllocationDragPatientPanel'
import { AllocationNurseLane } from '../components/allocation/AllocationNurseLane'
import { AllocationUnassignedStrip } from '../components/allocation/AllocationUnassignedStrip'
import { AllocationBedChip } from '../components/allocation/AllocationBedChip'
import { AllocationSidebar } from '../components/allocation/AllocationSidebar'
import { ConfirmAllocationDialog } from '../components/allocation/ConfirmAllocationDialog'
import {
  applyRunToCatalog,
  boardStateToItems,
  buildPatientCatalog,
  emptyBoardState,
  invertBoard,
  runToBoardState,
  type BoardState,
  type CatalogEntry,
} from '../components/allocation/allocationApiState'
import { AllocationCatalogProvider } from '../components/allocation/allocationCatalog'
import {
  buildBoardLoadRows,
  computeBoardLoads,
  computeBoardStats,
  nurseNamesFromRows,
} from '../components/allocation/allocationBoardUtils'
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
import { useShift } from '../context/ShiftContext'

type AllocationSnapshot = BoardState & { allocationRunId: string | null }

const leaderOpts = { userId: CHARGE_USER_ID }

export function ChargeAllocationPage() {
  const navigate = useNavigate()
  const { shiftId, selectedShift } = useShift()

  const [nurses, setNurses] = useState<ApiNurse[]>([])
  const [admissions, setAdmissions] = useState<ApiAdmission[]>([])
  const [catalog, setCatalog] = useState<Map<string, CatalogEntry>>(() => new Map())
  const [unassigned, setUnassigned] = useState<string[]>([])
  const [byNurse, setByNurse] = useState<Record<string, string[]>>({})
  const [allocationRunId, setAllocationRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<AllocationRun['status']>('none')
  const [suggestedOwner, setSuggestedOwner] = useState<Map<string, string>>(() => new Map())
  const [undoStack, setUndoStack] = useState<AllocationSnapshot[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nurseIds = useMemo(() => nurses.map((n) => n.id), [nurses])
  const nurseNames = useMemo(() => nurseNamesFromRows(nurses), [nurses])
  const readonly = runStatus === 'confirmed'
  const totalBeds = admissions.length

  const boardRef = useRef<HTMLDivElement>(null)
  const laneBodiesRef = useRef(new Map<string, HTMLElement>())
  const allocationRef = useRef({ unassigned, byNurse, allocationRunId })
  useEffect(() => {
    allocationRef.current = { unassigned, byNurse, allocationRunId }
  }, [unassigned, byNurse, allocationRunId])
  const lastOverRef = useRef<UniqueIdentifier | null>(null)
  const lastContainerOverRef = useRef<UniqueIdentifier | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const collisionDetection = useMemo(
    () => createAllocationCollisionDetection(nurseIds),
    [nurseIds],
  )

  const { loads, bedCounts } = useMemo(
    () => computeBoardLoads(catalog, byNurse, nurseIds),
    [catalog, byNurse, nurseIds],
  )
  const suggestedByNurse = useMemo(() => {
    const out = Object.fromEntries(nurseIds.map((id) => [id, [] as string[]]))
    for (const [admissionId, nurseId] of suggestedOwner.entries()) {
      if (out[nurseId]) out[nurseId].push(admissionId)
    }
    return out
  }, [nurseIds, suggestedOwner])
  const stats = useMemo(
    () => computeBoardStats(catalog, unassigned, byNurse, nurseIds, suggestedByNurse),
    [catalog, unassigned, byNurse, nurseIds, suggestedByNurse],
  )
  const loadRows = useMemo(
    () => buildBoardLoadRows(nurseIds, loads, bedCounts, stats.avg),
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

  const loadShiftBoard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nurseRows, admissionRows, latestRun] = await Promise.all([
        apiGet<ApiNurse[]>(`/nurses?shiftId=${shiftId}`),
        apiGet<ApiAdmission[]>(`/admissions?shiftId=${shiftId}&status=active`),
        apiGet<AllocationRun | null>(`/allocation-runs/current?shiftId=${shiftId}`),
      ])

      const allocatable = nurseRows.filter((n) => n.role === 'nurse' || n.role === 'charge_nurse')
      const ids = allocatable.map((n) => n.id)
      const nextCatalog = buildPatientCatalog(admissionRows)
      setNurses(allocatable)
      setAdmissions(admissionRows)

      if (latestRun?.allocationRunId) {
        applyRunToCatalog(nextCatalog, latestRun)
        const board = runToBoardState(latestRun, ids)
        setCatalog(new Map(nextCatalog))
        setUnassigned(board.unassigned)
        setByNurse(board.byNurse)
        setAllocationRunId(latestRun.allocationRunId)
        setRunStatus(latestRun.status)
        setSuggestedOwner(invertBoard(board.byNurse))
      } else {
        const board = emptyBoardState(
          admissionRows.map((a) => a.admissionId),
          ids,
        )
        setCatalog(new Map(nextCatalog))
        setUnassigned(board.unassigned)
        setByNurse(board.byNurse)
        setAllocationRunId(null)
        setRunStatus('none')
        setSuggestedOwner(new Map())
      }
      setUndoStack([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入分床資料失敗')
    } finally {
      setLoading(false)
    }
  }, [shiftId])

  useEffect(() => {
    void loadShiftBoard()
  }, [loadShiftBoard])

  function pushUndoFromRef() {
    const { unassigned: u, byNurse: b, allocationRunId: runId } = allocationRef.current
    setUndoStack((s) => [...s.slice(-12), { unassigned: [...u], byNurse: { ...b }, allocationRunId: runId }])
  }

  function applySnapshot(next: AllocationSnapshot) {
    setUnassigned(next.unassigned)
    setByNurse(next.byNurse)
    setAllocationRunId(next.allocationRunId)
  }

  async function persistDraft(nextByNurse: Record<string, string[]>, runId: string) {
    setSaving(true)
    try {
      const run = await apiPut<AllocationRun>(
        `/allocation-runs/${runId}/items`,
        { items: boardStateToItems(nextByNurse, suggestedOwner) },
        leaderOpts,
      )
      const nextCatalog = buildPatientCatalog(admissions)
      applyRunToCatalog(nextCatalog, run)
      setCatalog(new Map(nextCatalog))
      setRunStatus(run.status)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存分床失敗')
    } finally {
      setSaving(false)
    }
  }

  function applyContainers(containers: ReturnType<typeof buildContainers>) {
    const { unassigned: u, byNurse: b } = containersToState(containers, nurseIds)
    setUnassigned(u)
    setByNurse(b)
    const runId = allocationRef.current.allocationRunId
    if (runId && runStatus === 'draft') {
      void persistDraft(b, runId)
    }
  }

  function onDragStart(e: DragStartEvent) {
    if (readonly) return
    setActiveId(String(e.active.id))
    lastOverRef.current = null
    lastContainerOverRef.current = null
  }

  function onDragOver(e: DragOverEvent) {
    if (readonly) return
    const overId = e.over?.id
    if (!overId) return
    lastOverRef.current = overId
    if (isContainerDroppableId(overId, nurseIds)) {
      lastContainerOverRef.current = overId
    }
  }

  function onDragEnd(e: DragEndEvent) {
    if (readonly) return
    const activePid = String(e.active.id)
    setActiveId(null)

    let overId = e.over?.id ?? lastOverRef.current
    if (!overId) return

    if (String(overId) === String(activePid)) {
      overId = lastContainerOverRef.current
    }
    if (!overId) return

    const containers = buildContainers(
      allocationRef.current.unassigned,
      allocationRef.current.byNurse,
      nurseIds,
    )
    const toKey = resolveDropContainer(overId, activePid, containers, nurseIds)
    if (!toKey) return

    const next = applyDragMove({
      activeId: activePid,
      overId,
      containers,
      nurseIds,
    })
    if (!next || containersEqual(next, containers)) return

    if (!allocationRef.current.allocationRunId) {
      setError('請先按「套用系統建議分床」產生草稿')
      return
    }

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

  async function applySuggested() {
    setSuggestLoading(true)
    setError(null)
    try {
      pushUndoFromRef()
      const run = await apiPost<AllocationRun>(
        '/allocation-runs/suggest',
        { shiftId, targetShiftId: shiftId },
        leaderOpts,
      )
      const board = runToBoardState(run, nurseIds)
      const nextCatalog = buildPatientCatalog(admissions)
      applyRunToCatalog(nextCatalog, run)
      setCatalog(new Map(nextCatalog))
      setUnassigned(board.unassigned)
      setByNurse(board.byNurse)
      setAllocationRunId(run.allocationRunId)
      setRunStatus(run.status)
      setSuggestedOwner(invertBoard(board.byNurse))
    } catch (err) {
      setError(err instanceof Error ? err.message : '產生建議分床失敗')
    } finally {
      setSuggestLoading(false)
    }
  }

  function handleUndo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    applySnapshot(prev)
    setUndoStack((s) => s.slice(0, -1))
    if (prev.allocationRunId && runStatus === 'draft') {
      void persistDraft(prev.byNurse, prev.allocationRunId)
    }
  }

  async function handleConfirm() {
    if (!allocationRunId) {
      setError('請先產生並調整分床草稿')
      return
    }
    setConfirming(true)
    setError(null)
    try {
      await apiPost<AllocationRun>(`/allocation-runs/${allocationRunId}/confirm`, {}, leaderOpts)
      setConfirmOpen(false)
      navigate('/leader/allocation-result', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '確認分床失敗')
    } finally {
      setConfirming(false)
    }
  }

  const activeBed = activeId ? catalog.get(activeId) ?? null : null
  const activePatient = activeBed

  if (loading) {
    return <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-700 ring-1 ring-black/10">載入分床板…</div>
  }

  return (
    <AllocationCatalogProvider catalog={catalog}>
      <div className="grid gap-4">
        {selectedShift ? (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-black/10">
            目前班別：<span className="font-semibold text-slate-900">{selectedShift.label}</span>
            {runStatus === 'confirmed' ? (
              <span className="ml-2 rounded-full bg-[#eaf7ee] px-2 py-0.5 text-xs font-semibold text-[#1e6c3a]">已確認（僅供檢視，可重新套用產生新草稿）</span>
            ) : runStatus === 'draft' ? (
              <span className="ml-2 rounded-full bg-[#fff7ed] px-2 py-0.5 text-xs font-semibold text-[#9a5b1a]">草稿{saving ? ' · 儲存中…' : ''}</span>
            ) : (
              <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-slate-600">尚未分床</span>
            )}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl bg-[#ffe8e1] px-4 py-3 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">{error}</div>
        ) : null}

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
                    suggestLoading={suggestLoading}
                  />
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {nurseIds.map((nid) => {
                      const row = loadRows.find((r) => r.nurseId === nid)
                      return (
                        <AllocationNurseLane
                          key={nid}
                          id={nid}
                          title={nurseNames[nid] ?? nid}
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
            nurseNames={nurseNames}
            canUndo={undoStack.length > 0 && !readonly}
            onUndo={handleUndo}
            onConfirm={() => setConfirmOpen(true)}
            confirmDisabled={!allocationRunId || confirming || unassigned.length > 0}
            readonly={readonly}
          />
        </div>
      </div>

      {confirmOpen ? (
        <ConfirmAllocationDialog
          stats={stats}
          totalBeds={totalBeds}
          nurseNames={nurseNames}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </AllocationCatalogProvider>
  )
}
