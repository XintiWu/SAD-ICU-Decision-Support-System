import { useDroppable } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useOptionalAllocationCatalog } from './useAllocationCatalog'
import { UNASSIGNED_DROP_ID } from './allocationDnd'
import { AllocationBedChip } from './AllocationBedChip'

type Props = {
  items: string[]
  activePatientId?: string | null
  onSuggest?: () => void
  suggestLoading?: boolean
  disableSuggest?: boolean
  onViewDecision?: () => void
  viewDecisionLoading?: boolean
}

export function AllocationUnassignedStrip({
  items,
  activePatientId,
  onSuggest,
  suggestLoading,
  disableSuggest,
  onViewDecision,
  viewDecisionLoading,
}: Props) {
  const catalogCtx = useOptionalAllocationCatalog()
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED_DROP_ID })
  const dragging = activePatientId != null

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/8">
      <header className="flex flex-wrap items-center gap-3 border-b border-black/5 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-muted text-base" aria-hidden>
            🛏
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">待分配病患</h2>
            <p className="mt-0.5 text-[11px] text-slate-600">
              依右上角<strong className="font-bold text-slate-700">班別</strong>載入資料。可按
              <strong className="font-bold text-slate-700">「套用系統建議分床」</strong>呼叫後端演算法，再拖曳微調並確認送出。
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-black/5">
            {items.length} 床
          </span>
          {onSuggest ? (
            <div className="flex items-center gap-2">
              {onViewDecision ? (
                <button
                  type="button"
                  disabled={viewDecisionLoading}
                  onClick={onViewDecision}
                  className="flex items-center gap-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {viewDecisionLoading ? '計算決策中…' : '查看分床決策'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={disableSuggest || suggestLoading}
                onClick={onSuggest}
                className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm ring-1 ring-black/10 hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 disabled:opacity-60 cursor-pointer"
              >
                {suggestLoading ? '產生中…' : '套用系統建議分床'}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={[
          'p-2 transition-colors',
          isOver ? 'bg-[#fff1f2] ring-2 ring-inset ring-[#f87171]' : dragging ? 'bg-[#fffafa]' : '',
        ].join(' ')}
      >
        <SortableContext items={items} strategy={horizontalListSortingStrategy}>
          <div
            className={[
              'flex min-h-[36px] items-start gap-2 rounded-lg border border-dashed px-2 py-2',
              items.length === 0
                ? 'justify-center border-[#fecdd3] bg-[#fffafa]'
                : 'border-[#fecdd3] bg-[#fffafa]',
              isOver ? 'border-[#f87171] bg-[#fff1f2]' : '',
            ].join(' ')}
          >
            <span className="shrink-0 self-start pt-1.5 text-xs font-bold leading-none text-[#b3341f]">
              未分配病患：{items.length === 0 ? '：無' : ''}
            </span>
            {items.length > 0 ? (
              <div className="flex min-w-0 flex-1 flex-wrap content-start items-start gap-1.5">
                {items.map((pid) => {
                  const bed = catalogCtx?.getBed(pid)
                  if (!bed) return null
                  return (
                    <AllocationBedChip
                      key={pid}
                      bed={bed}
                      dragging={activePatientId === pid}
                    />
                  )
                })}
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>
    </section>
  )
}
