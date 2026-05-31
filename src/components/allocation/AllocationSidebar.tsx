import type { AllocationStats, NurseLoadRow } from './allocationUtils'
import { formatDelta } from './allocationUtils'

function resolveNurseName(nurseNames: Record<string, string> | undefined, nurseId: string) {
  if (nurseNames?.[nurseId]) return nurseNames[nurseId]
  return nurseId.slice(-4)
}

const barClass = {
  high: 'bg-[#c64a2c]',
  mid: 'bg-[#d88b2c]',
  low: 'bg-[#2f7a44]',
} as const

type Props = {
  stats: AllocationStats
  loadRows: NurseLoadRow[]
  nurseNames?: Record<string, string>
  canUndo?: boolean
  onUndo?: () => void
  onSuggest?: () => void
  onConfirm: () => void
  confirmDisabled?: boolean
  readonly?: boolean
}

export function AllocationSidebar({
  stats,
  loadRows,
  nurseNames,
  canUndo,
  onUndo,
  onSuggest,
  onConfirm,
  confirmDisabled,
  readonly,
}: Props) {
  const maxBar = Math.max(stats.max, 1)

  const balanceHint =
    stats.spread > 4 ? '負荷略有不均，建議微調高分床分配' : '目前負荷分布尚可'

  return (
    <aside className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-black/10 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start">
      <div>
        <h2 className="text-sm font-bold text-slate-900">負荷平衡</h2>
        <p className="mt-1 text-xs text-slate-600">依麻煩度加總 · 含床數與與平均差距</p>
      </div>

      <div className="rounded-xl bg-surface p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-black/5">
        {stats.maxNurseId && stats.minNurseId ? (
          <p>
            <span className="font-semibold text-slate-800">最高</span>{' '}
            {resolveNurseName(nurseNames, stats.maxNurseId)} {stats.max}
            <span className="mx-1 text-slate-400">·</span>
            <span className="font-semibold text-slate-800">最低</span>{' '}
            {resolveNurseName(nurseNames, stats.minNurseId)} {stats.min}
          </p>
        ) : null}
        <p className="mt-1.5">{balanceHint}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loadRows.map((row) => (
          <div key={row.nurseId}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">{resolveNurseName(nurseNames, row.nurseId)}</span>
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
          disabled={confirmDisabled || readonly}
          className="w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
        >
          確認送出分床
        </button>
        <p className="text-[11px] leading-relaxed text-slate-500">
          送出後寫入資料庫並更新「查看分床結果」與戰情室。
        </p>
      </div>
    </aside>
  )
}

