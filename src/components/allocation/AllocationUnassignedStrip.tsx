import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import type { PatientId } from '../../data/allocationMock'
import { UNASSIGNED_DROP_ID } from './allocationDnd'
import { AllocationBedChip } from './AllocationBedChip'
import { enrichBed } from './allocationUtils'

type Props = {
  items: PatientId[]
  activePatientId?: PatientId | null
  onQuickAssign?: (pid: PatientId) => void
  onSuggest?: () => void
}

export function AllocationUnassignedStrip({
  items,
  activePatientId,
  onQuickAssign,
  onSuggest,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED_DROP_ID })
  const dragging = activePatientId != null

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/8">
      <header className="flex flex-wrap items-center gap-3 border-b border-black/5 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f3ef] text-base" aria-hidden>
            🛏
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">待分配病患</h2>
            <p className="text-[11px] text-slate-500">拖曳床卡到此處可移出護理師負荷</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[#fafaf8] px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-black/5">
            {items.length} 床
          </span>
          {onSuggest ? (
            <button
              type="button"
              onClick={onSuggest}
              className="rounded-xl bg-[#1a1f2e] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black/90"
            >
              系統建議分床
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={[
          'min-h-[88px] p-3 transition-colors',
          isOver ? 'bg-[#fff1f2] ring-2 ring-inset ring-[#f87171]' : dragging ? 'bg-[#fffafa]' : '',
        ].join(' ')}
      >
        <SortableContext items={items} strategy={horizontalListSortingStrategy}>
          <div
            className={[
              'flex min-h-[64px] flex-wrap items-stretch gap-2 rounded-xl border border-dashed p-2',
              items.length === 0 ? 'border-[#fecdd3] bg-[#fffafa]' : 'border-black/10 bg-[#fafaf8]/50',
              isOver ? 'border-[#f87171] bg-[#fff1f2]' : '',
            ].join(' ')}
          >
            {items.length === 0 ? (
              <div className="flex min-h-[56px] flex-1 items-center justify-center px-4 text-center text-xs text-slate-500">
                {dragging ? '放開滑鼠 — 移入待分配' : '將床卡拖曳到此，或按「系統建議分床」'}
              </div>
            ) : (
              <>
                {items.map((pid) => (
                  <AllocationBedChip
                    key={pid}
                    bed={enrichBed(pid)}
                    dragging={activePatientId === pid}
                    onQuickAssign={onQuickAssign ? () => onQuickAssign(pid) : undefined}
                  />
                ))}
                {dragging ? (
                  <div className="flex min-h-[52px] min-w-[96px] flex-1 items-center justify-center rounded-lg border-2 border-dashed border-[#f87171] bg-[#fff1f2] text-[11px] font-bold text-[#b3341f]">
                    放到此
                  </div>
                ) : null}
              </>
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  )
}
