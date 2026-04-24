import { DndContext, closestCenter, useDroppable } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import { useMemo, useState } from 'react'

type NurseId = 'n1' | 'n2' | 'n3'
type PatientId = 'p5' | 'p9' | 'p2' | 'p7' | 'p3'

type Patient = {
  id: PatientId
  label: string
  score: number
  tone: 'high' | 'mid' | 'low'
}

const PATIENTS: Record<PatientId, Patient> = {
  p5: { id: 'p5', label: '床 5 — 心衰竭', score: 18, tone: 'high' },
  p9: { id: 'p9', label: '床 9 — 肺炎', score: 11, tone: 'mid' },
  p2: { id: 'p2', label: '床 2 — 敗血症', score: 17, tone: 'high' },
  p7: { id: 'p7', label: '床 7 — COPD', score: 9, tone: 'low' },
  p3: { id: 'p3', label: '床 3 — 術後照護', score: 9, tone: 'low' },
}

export function ChargeAllocationPage() {
  const [unassigned, setUnassigned] = useState<PatientId[]>(['p5', 'p9'])
  const [byNurse, setByNurse] = useState<Record<NurseId, PatientId[]>>({
    n1: ['p2', 'p7'],
    n2: ['p3'],
    n3: [],
  })
  const [suggestedAt, setSuggestedAt] = useState<string | null>(null)

  const loads = useMemo(() => {
    const sum = (ids: PatientId[]) => ids.reduce((acc, id) => acc + PATIENTS[id].score, 0)
    return { n1: sum(byNurse.n1), n2: sum(byNurse.n2), n3: sum(byNurse.n3) }
  }, [byNurse])

  function onDragEnd(e: DragEndEvent) {
    const activeId = e.active.id as PatientId
    const overId = e.over?.id as string | undefined
    if (!overId) return

    const containers: Record<string, PatientId[]> = {
      unassigned: unassigned,
      n1: byNurse.n1,
      n2: byNurse.n2,
      n3: byNurse.n3,
    }

    const fromKey = Object.keys(containers).find((k) => containers[k].includes(activeId))
    if (!fromKey) return

    const toKey =
      overId === 'unassigned' || overId === 'n1' || overId === 'n2' || overId === 'n3'
        ? overId
        : (Object.keys(containers).find((k) => containers[k].includes(overId as PatientId)) ?? fromKey)

    if (fromKey === toKey) {
      const list = containers[fromKey]
      const oldIndex = list.indexOf(activeId)
      const newIndex = list.indexOf(overId as PatientId)
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const moved = arrayMove(list, oldIndex, newIndex)
        applyContainer(fromKey, moved)
      }
      return
    }

    const fromList = [...containers[fromKey]]
    const toList = [...containers[toKey]]
    const fromIndex = fromList.indexOf(activeId)
    if (fromIndex === -1) return
    fromList.splice(fromIndex, 1)

    const insertIndex =
      overId === toKey ? toList.length : Math.max(0, toList.indexOf(overId as PatientId))
    toList.splice(insertIndex, 0, activeId)

    applyContainer(fromKey, fromList)
    applyContainer(toKey, toList)
  }

  function applyContainer(key: string, list: PatientId[]) {
    if (key === 'unassigned') setUnassigned(list)
    if (key === 'n1') setByNurse((p) => ({ ...p, n1: list }))
    if (key === 'n2') setByNurse((p) => ({ ...p, n2: list }))
    if (key === 'n3') setByNurse((p) => ({ ...p, n3: list }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">分床建議與調整</div>
            <div className="mt-1 text-xs text-slate-600">
              可拖拉病患卡片至不同護理師欄位手動調整；右側即時顯示負荷變化
            </div>
          </div>
          <div className="flex items-center gap-2">
            {suggestedAt ? (
              <span className="rounded-full bg-[#fafaf8] px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/5">
                已產出：{suggestedAt}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                // 原型：按下即回到「系統建議」的初始分配
                setUnassigned(['p5', 'p9'])
                setByNurse({ n1: ['p2', 'p7'], n2: ['p3'], n3: [] })
                setSuggestedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              產出建議分床
            </button>
          </div>
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
            <Column title="未分配病患" id="unassigned" items={unassigned} />
            <div className="grid gap-4">
              <Column title="護理師 A — 王小明" id="n1" items={byNurse.n1} load={loads.n1} />
              <Column title="護理師 B — 陳美麗" id="n2" items={byNurse.n2} load={loads.n2} />
              <Column title="護理師 C — 林志強" id="n3" items={byNurse.n3} load={loads.n3} />
            </div>
          </div>
        </DndContext>
      </section>

      <aside className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">負荷概覽</div>
        <div className="mt-5 grid gap-4 text-sm">
          <LoadRow name="王小明" load={loads.n1} tone={loads.n1 >= 20 ? 'high' : loads.n1 >= 14 ? 'mid' : 'low'} />
          <LoadRow name="陳美麗" load={loads.n2} tone={loads.n2 >= 20 ? 'high' : loads.n2 >= 14 ? 'mid' : 'low'} />
          <LoadRow name="林志強" load={loads.n3} tone={loads.n3 >= 20 ? 'high' : loads.n3 >= 14 ? 'mid' : 'low'} />
        </div>

        <div className="mt-6 rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
          <div className="text-xs font-semibold text-slate-800">拖拉後即時更新</div>
          <div className="mt-2 text-xs text-slate-600">確認送出前，可先用此頁做分床平衡。</div>
          <button
            type="button"
            className="mt-3 w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
          >
            確認送出
          </button>
        </div>
      </aside>
    </div>
  )
}

function Column({
  title,
  id,
  items,
  load,
}: {
  title: string
  id: string
  items: PatientId[]
  load?: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      className={[
        'rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5',
        isOver ? 'ring-2 ring-black/30' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-800">{title}</div>
        {typeof load === 'number' ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-black/10">
            負荷 {load}
          </span>
        ) : null}
      </div>

      <div
        ref={setNodeRef}
        className="mt-3 rounded-2xl border border-dashed border-black/15 p-3"
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {items.length === 0 ? (
              <div className="rounded-xl bg-white p-3 text-xs text-slate-500 ring-1 ring-black/5">
                拖拉病患到這裡
              </div>
            ) : null}
            {items.map((pid) => (
              <SortablePatientCard key={pid} patient={PATIENTS[pid]} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

function SortablePatientCard({ patient, compact }: { patient: Patient; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: patient.id,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const pill =
    patient.tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : patient.tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        compact
          ? 'flex min-w-[280px] items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5'
          : 'flex w-full min-w-[280px] items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5',
        isDragging ? 'opacity-70 shadow-lg' : '',
      ].join(' ')}
      {...attributes}
      {...listeners}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/5 text-slate-700">
          ⋮⋮
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="whitespace-nowrap text-sm font-semibold text-slate-900">
            {patient.label}
          </div>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>
        {patient.score}分
      </span>
    </div>
  )
}

function LoadRow({
  name,
  load,
  tone,
}: {
  name: string
  load: number
  tone: 'high' | 'mid' | 'low'
}) {
  const bar =
    tone === 'high' ? 'bg-[#c64a2c]' : tone === 'mid' ? 'bg-[#d88b2c]' : 'bg-[#2f7a44]'
  const pct = Math.min(100, Math.round((load / 30) * 100))
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-semibold text-slate-900">{name}</span>
        <span className="rounded-full bg-[#fafaf8] px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-black/5">
          {load}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/5">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

