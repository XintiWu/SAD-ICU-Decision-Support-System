import { NURSES } from '../../data/allocationMock'
import { SaveHandoverSnapshotButton } from '../SaveHandoverSnapshotButton'
import type { AllocationStats, NurseLoadRow } from './allocationUtils'
import { formatDelta } from './allocationUtils'

const barClass = {
  high: 'bg-[#c64a2c]',
  mid: 'bg-[#d88b2c]',
  low: 'bg-[#2f7a44]',
} as const

type Props = {
  stats: AllocationStats
  loadRows: NurseLoadRow[]
  canUndo?: boolean
  onUndo?: () => void
  onSuggest?: () => void
  onConfirm: () => void
}

export function AllocationSidebar({ stats, loadRows, canUndo, onUndo, onSuggest, onConfirm }: Props) {
  const maxBar = Math.max(stats.max, 1)

  const balanceHint =
    stats.spread > 8 && stats.maxNurseId && stats.minNurseId
      ? `最大差距 ${stats.spread} 分：可考慮從 ${NURSES[stats.maxNurseId].shortName} 移 1 床至 ${NURSES[stats.minNurseId].shortName}`
      : stats.spread > 4
        ? '負荷略有不均，建議微調高分床分配'
        : '目前負荷分布尚可'

  return (
    <aside className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/10 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start">
      <div>
        <h2 className="text-sm font-bold text-slate-900">負荷平衡</h2>
        <p className="mt-1 text-xs text-slate-600">依麻煩度加總 · 含床數與與平均差距</p>
      </div>

      <div className="rounded-xl bg-[#fafaf8] p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-black/5">
        {stats.maxNurseId && stats.minNurseId ? (
          <p>
            <span className="font-semibold text-slate-800">最高</span> {NURSES[stats.maxNurseId].shortName}{' '}
            {stats.max}
            <span className="mx-1 text-slate-400">·</span>
            <span className="font-semibold text-slate-800">最低</span> {NURSES[stats.minNurseId].shortName}{' '}
            {stats.min}
          </p>
        ) : null}
        <p className="mt-1.5">{balanceHint}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loadRows.map((row) => (
          <div key={row.nurseId}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">{NURSES[row.nurseId].shortName}</span>
              <span className="text-slate-600">
                {row.load} · {row.bedCount}床 · Δ{formatDelta(row.deltaFromAvg)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/5">
              <div
                className={`h-full rounded-full ${barClass[row.tone]}`}
                style={{ width: `${Math.min(100, Math.round((row.load / maxBar) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {onUndo || onSuggest ? (
        <div className="flex gap-2">
          {onUndo ? (
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5 disabled:opacity-40"
            >
              還原上一步
            </button>
          ) : null}
          {onSuggest ? (
            <button
              type="button"
              onClick={onSuggest}
              className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              系統建議
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="shrink-0 space-y-2 border-t border-black/5 pt-4">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-black/90"
        >
          確認送出分床
        </button>
        <SaveHandoverSnapshotButton className="w-full" variant="secondary" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          送出前會檢查未分配與負荷差距；送出後可至「查看分床結果」核對。
        </p>
      </div>
    </aside>
  )
}

