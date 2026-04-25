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
import { useNavigate } from 'react-router-dom'
import { INITIAL_BY_NURSE, INITIAL_UNASSIGNED, NURSES, PATIENTS } from '../data/allocationMock'
import type { NurseId, Patient, PatientId } from '../data/allocationMock'

export function ChargeAllocationPage() {
  const navigate = useNavigate()
  const [unassigned, setUnassigned] = useState<PatientId[]>(INITIAL_UNASSIGNED)
  const [byNurse, setByNurse] = useState<Record<NurseId, PatientId[]>>(INITIAL_BY_NURSE)
  const [suggestedAt, setSuggestedAt] = useState<string | null>(null)

  const nurseIds = useMemo(() => Object.keys(NURSES) as NurseId[], [])
  const totalBeds = useMemo(() => Object.keys(PATIENTS).length, [])

  const loads = useMemo(() => {
    const sum = (ids: PatientId[]) => ids.reduce((acc, id) => acc + PATIENTS[id].score, 0)
    const next: Record<NurseId, number> = {} as Record<NurseId, number>
    for (const nid of nurseIds) next[nid] = sum(byNurse[nid] ?? [])
    return next
  }, [byNurse, nurseIds])

  const nurseIdsByLoad = useMemo(() => {
    return [...nurseIds].sort((a, b) => (loads[b] ?? 0) - (loads[a] ?? 0))
  }, [nurseIds, loads])

  const loadStats = useMemo(() => {
    if (nurseIds.length === 0) return { maxId: null as NurseId | null, max: 0, avg: 0 }
    const values = nurseIds.map((nid) => loads[nid] ?? 0)
    const sum = values.reduce((a, b) => a + b, 0)
    const avg = Math.round((sum / values.length) * 10) / 10
    let maxId = nurseIds[0]
    for (const nid of nurseIds) if ((loads[nid] ?? 0) > (loads[maxId] ?? 0)) maxId = nid
    return { maxId, max: loads[maxId] ?? 0, avg }
  }, [loads, nurseIds])

  function onDragEnd(e: DragEndEvent) {
    const activeId = e.active.id as PatientId
    const overId = e.over?.id as string | undefined
    if (!overId) return

    const containers: Record<string, PatientId[]> = { unassigned }
    for (const nid of nurseIds) containers[nid] = byNurse[nid] ?? []

    const fromKey = Object.keys(containers).find((k) => containers[k].includes(activeId))
    if (!fromKey) return

    const toKey = Object.prototype.hasOwnProperty.call(containers, overId)
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
    if (key !== 'unassigned') setByNurse((p) => ({ ...p, [key]: list } as Record<NurseId, PatientId[]>))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[280px]">
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
                setUnassigned(INITIAL_UNASSIGNED)
                setByNurse(INITIAL_BY_NURSE)
                setSuggestedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
              }}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              系統建議分床
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard label="未分配" value={unassigned.length} unit="床" tone={unassigned.length > 0 ? 'alert' : 'good'} />
          <StatCard label="病患" value={totalBeds} unit="床" tone="neutral" />
          <StatCard label="護理師" value={nurseIds.length} unit="位" tone="neutral" />
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-black/10">
            <div>
              <div className="text-sm font-semibold text-slate-900">分配看板</div>
              <div className="mt-1 text-xs text-slate-600">
                先處理左側「未分配」，再拖拉到右側護理師欄位完成分床
              </div>
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-[320px_1fr]">
              <Column
                title="未分配"
                subtitle="優先處理"
                id="unassigned"
                items={unassigned}
                compactCards
                variant="unassigned"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                {nurseIds.map((nid) => (
                  <Column
                    key={nid}
                    title={NURSES[nid].shortName}
                    subtitle={splitNurseLabel(NURSES[nid].label).role}
                    id={nid}
                    items={byNurse[nid] ?? []}
                    load={loads[nid]}
                    compactCards
                  />
                ))}
              </div>
            </div>
          </div>
        </DndContext>
      </section>

      <aside className="rounded-2xl bg-white p-6 ring-1 ring-black/10 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">負荷概覽</div>
            <div className="mt-1 text-xs text-slate-600">依負荷由高到低排序，便於快速調整</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-600">平均</div>
            <div className="text-sm font-semibold text-slate-900">{loadStats.avg}</div>
          </div>
        </div>

        {loadStats.maxId ? (
          <div className="mt-4 rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
            <div className="text-xs font-semibold text-slate-800">目前最高負荷</div>
            <div className="mt-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-900">{NURSES[loadStats.maxId].shortName}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-black/10">
                {loadStats.max}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 text-sm">
          {nurseIdsByLoad.map((nid) => (
            <LoadRow
              key={nid}
              name={NURSES[nid].shortName}
              load={loads[nid]}
              tone={loads[nid] >= 20 ? 'high' : loads[nid] >= 14 ? 'mid' : 'low'}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
          <div className="text-xs font-semibold text-slate-800">拖拉後即時更新</div>
          <div className="mt-2 text-xs text-slate-600">確認送出前，可先用此頁做分床平衡。</div>
          <button
            type="button"
            onClick={() => navigate('/leader/allocation-result')}
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
  subtitle,
  id,
  items,
  load,
  compactCards,
  variant,
}: {
  title: string
  subtitle?: string
  id: string
  items: PatientId[]
  load?: number
  compactCards?: boolean
  variant?: 'default' | 'unassigned'
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      className={[
        variant === 'unassigned'
          ? 'rounded-2xl bg-[#fffafa] p-4 ring-1 ring-[#fecdd3]'
          : 'rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5',
        isOver ? 'ring-2 ring-black/30' : '',
      ].join(' ')}
    >
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {subtitle ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
                  {subtitle}
                </span>
              ) : null}
              <div className="text-sm font-semibold leading-tight text-slate-900">{title}</div>
            </div>
          </div>
          {typeof load === 'number' ? (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-black/10">
              負荷 {load}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        ref={setNodeRef}
        className={[
          title ? 'mt-3' : '',
          'rounded-2xl border border-dashed border-black/15 p-3',
        ].join(' ')}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="grid gap-2">
            {items.length === 0 ? (
              <div className="rounded-xl bg-white p-3 text-xs text-slate-500 ring-1 ring-black/5">
                拖拉病患到這裡
              </div>
            ) : null}
            {items.map((pid) => (
              <SortablePatientCard key={pid} patient={PATIENTS[pid]} compact={compactCards} />
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

  const rail = patient.tone === 'high' ? 'bg-[#c64a2c]' : patient.tone === 'mid' ? 'bg-[#d88b2c]' : 'bg-[#2f7a44]'
  const { bed, diagnosis } = splitPatientLabel(patient.label)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'relative',
        compact
          ? 'flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/5'
          : 'flex w-full items-center justify-between gap-3 rounded-xl bg-white p-3.5 ring-1 ring-black/5',
        isDragging ? 'opacity-80 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)]' : 'hover:shadow-[0_10px_26px_-18px_rgba(0,0,0,0.35)]',
      ].join(' ')}
      {...attributes}
      {...listeners}
    >
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${rail}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 items-center gap-3 pl-1">
        <div
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        >
          <span className="block h-1 w-1 rounded-full bg-current opacity-80" />
          <span className="mt-1 block h-1 w-1 rounded-full bg-current opacity-80" />
          <span className="mt-1 block h-1 w-1 rounded-full bg-current opacity-80" />
        </div>
        <div className="min-w-0 flex-1 pl-4">
          <div className="text-sm font-semibold leading-tight text-slate-900">{bed}</div>
          <div className="mt-0.5 whitespace-normal break-words text-sm font-medium leading-snug text-slate-700">
            {diagnosis}
          </div>
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>
        {patient.score}分
      </span>
    </div>
  )
}

function splitNurseLabel(label: string) {
  const normalized = label.replace(/\s+/g, ' ').trim()
  const m = normalized.match(/^護理師\s*([A-Za-z0-9]+)\s*[—-]\s*(.+)$/)
  if (m) return { role: `護理師 ${m[1]}`, name: m[2] }
  return { role: '護理師', name: normalized }
}

function splitPatientLabel(label: string) {
  const normalized = label.replace(/\s+/g, ' ').trim()
  const m = normalized.match(/^床\s*(\d+)\s*[—-]\s*(.+)$/)
  if (m) return { bed: `床${m[1]}`, diagnosis: m[2] }

  const parts = normalized.split(/[—-]/).map((s) => s.trim())
  if (parts.length >= 2) {
    const bedPart = parts[0].replace(/\s+/g, '')
    const bed = bedPart.startsWith('床') ? bedPart : `床${bedPart}`
    return { bed, diagnosis: parts.slice(1).join(' — ') }
  }

  return { bed: normalized, diagnosis: '' }
}

function StatCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: number
  unit: string
  tone: 'neutral' | 'good' | 'alert'
}) {
  const frame =
    tone === 'alert'
      ? 'bg-[#fff1f2] ring-1 ring-[#fecdd3]'
      : tone === 'good'
        ? 'bg-[#eaf7ee] ring-1 ring-[#b7e0c5]'
        : 'bg-[#fafaf8] ring-1 ring-black/5'

  const valueColor = tone === 'alert' ? 'text-[#b3341f]' : 'text-slate-900'

  return (
    <div className={`rounded-2xl p-4 ${frame}`}>
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className={`text-2xl font-semibold leading-none ${valueColor}`}>{value}</div>
        <div className="text-sm font-semibold text-slate-700">{unit}</div>
      </div>
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

