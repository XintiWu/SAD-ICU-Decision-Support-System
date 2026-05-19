import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { PatientId } from '../../data/allocationMock'
import { AllocationBedChip } from './AllocationBedChip'
import { enrichBed, LOAD_BAR_MAX, type NurseLoadTone } from './allocationUtils'

const barClass: Record<NurseLoadTone, string> = {
  high: 'bg-[#e85d4a]',
  mid: 'bg-[#e8a43a]',
  low: 'bg-[#3d9b5f]',
}

type Props = {
  id: string
  title: string
  items: PatientId[]
  load?: number
  bedCount?: number
  loadTone?: NurseLoadTone
  activePatientId?: PatientId | null
  onQuickAssign?: (pid: PatientId) => void
  onRegisterBody?: (laneId: string, el: HTMLDivElement | null) => void
}

export function AllocationNurseLane({
  id,
  title,
  items,
  load = 0,
  bedCount,
  loadTone = 'mid',
  activePatientId,
  onQuickAssign,
  onRegisterBody,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `lane:${id}` })
  const surname = title.charAt(0)
  const beds = bedCount ?? items.length
  const barPct = Math.min(100, Math.round((load / LOAD_BAR_MAX) * 100))
  const dragging = activePatientId != null

  return (
    <section
      ref={setNodeRef}
      className={[
        'flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/8 transition-shadow',
        isOver ? 'ring-2 ring-black/25 shadow-md' : '',
      ].join(' ')}
    >
      <header className="pointer-events-none border-b border-black/5 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f3ef] text-sm font-bold text-slate-700">
            {surname}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-slate-900">{title}</div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/5">
              <div className={`h-full rounded-full ${barClass[loadTone]}`} style={{ width: `${barPct}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right text-[11px] font-semibold text-slate-600">
            <span className="text-slate-900">{beds}床</span>
            <span className="mx-0.5 text-slate-400">·</span>
            <span>{load}分</span>
          </div>
        </div>
      </header>

      <div
        ref={(el) => onRegisterBody?.(id, el)}
        className={['min-h-[100px] p-2.5', isOver ? 'bg-[#fafaf8]' : ''].join(' ')}
      >
        <SortableContext items={items} strategy={rectSortingStrategy}>
          {items.length === 0 ? (
                <div
              className={[
                'flex min-h-[88px] items-center justify-center rounded-xl border border-dashed text-xs font-medium',
                dragging
                  ? 'border-black/25 bg-[#fafaf8] text-slate-600'
                  : 'border-black/15 bg-[#fafaf8] text-slate-500',
              ].join(' ')}
            >
              {dragging ? '放開以移入' : '拖入病患'}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((pid) => (
                <AllocationBedChip
                  key={pid}
                  bed={enrichBed(pid)}
                  fill
                  dragging={activePatientId === pid}
                  onQuickAssign={onQuickAssign ? () => onQuickAssign(pid) : undefined}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </section>
  )
}
