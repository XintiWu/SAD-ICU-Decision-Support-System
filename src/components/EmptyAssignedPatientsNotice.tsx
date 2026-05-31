import { DEMO_NURSE_SHIFT_HINTS } from '../lib/shiftLabel'

type Props = {
  nurseName: string
  shiftLabel?: string
  onRoster: boolean | null
  allPatientCount?: number
}

export function EmptyAssignedPatientsNotice({
  nurseName,
  shiftLabel,
  onRoster,
  allPatientCount,
}: Props) {
  return (
    <div className="rounded-2xl bg-[#fafaf8] px-5 py-8 text-center ring-1 ring-black/5">
      <div className="text-sm font-semibold text-slate-800">
        此班別目前沒有分配給 {nurseName} 的病患
      </div>
      {shiftLabel ? (
        <p className="mt-2 text-xs text-slate-500">
          目前班別：<span className="font-semibold text-slate-700">{shiftLabel}</span>
          {allPatientCount != null && allPatientCount > 0
            ? `（本班共 ${allPatientCount} 位病患）`
            : null}
        </p>
      ) : null}
      {onRoster === false ? (
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-slate-600">
          <strong className="font-semibold text-slate-800">{shiftLabel ?? '此班別'}</strong>
          的排班名單<strong className="font-semibold text-slate-800">不含 {nurseName}</strong>。
          同名「白班 07:00-15:00」可能對應不同日期，請看右上角班別的<strong className="font-semibold text-slate-700">完整日期</strong>再選。
        </p>
      ) : onRoster === true ? (
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-slate-600">
          {nurseName} <strong className="font-semibold text-slate-800">有在此班值班</strong>，但尚未完成分床分配。
          請至「指派分床配對」套用系統建議分床，或請管理者執行 demo 分床 seed。
        </p>
      ) : (
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-600">
          「我的病患」只顯示分床後指派給 {nurseName} 的床位，不是整班全部病人。
        </p>
      )}
      <p className="mt-3 text-xs text-[#1e4ea7]">
        Demo 建議班別：{DEMO_NURSE_SHIFT_HINTS.join('、')}
      </p>
    </div>
  )
}
