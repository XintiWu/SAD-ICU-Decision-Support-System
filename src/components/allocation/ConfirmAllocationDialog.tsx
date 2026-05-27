import { NURSES } from '../../data/allocationMock'
import type { AllocationStats } from './allocationUtils'

type Props = {
  stats: AllocationStats
  totalBeds: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmAllocationDialog({ stats, totalBeds, onConfirm, onCancel }: Props) {
  const warnings: string[] = []
  if (stats.unassignedCount > 0) warnings.push(`仍有 ${stats.unassignedCount} 床未分配`)
  if (stats.spread > 10) warnings.push(`負荷差距達 ${stats.spread} 分，建議再平衡`)
  else if (stats.spread > 6) warnings.push(`負荷差距 ${stats.spread} 分，請確認是否符合班表期待`)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/10">
        <h3 className="text-sm font-bold text-slate-900">確認送出分床？</h3>
        <p className="mt-2 text-xs text-slate-600">
          將公布本班分配至「查看分床結果」，並自動儲存交班快照；護理師首頁亦會同步更新。
        </p>
        <ul className="mt-3 space-y-1 text-xs text-slate-700">
          <li>
            · 已分配 {totalBeds - stats.unassignedCount} / {totalBeds} 床
          </li>
          <li>· 班級平均負荷 {stats.avg}</li>
          {stats.maxNurseId && stats.minNurseId ? (
            <li>
              · 最高 {NURSES[stats.maxNurseId].shortName} {stats.max} / 最低{' '}
              {NURSES[stats.minNurseId].shortName} {stats.min}
            </li>
          ) : null}
        </ul>
        {warnings.length ? (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            {warnings.map((w) => (
              <p key={w}>⚠ {w}</p>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
          >
            再調整
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
          >
            確認送出
          </button>
        </div>
      </div>
    </div>
  )
}
