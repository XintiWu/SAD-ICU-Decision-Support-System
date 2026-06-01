import { useShift } from '../context/useShift'
import { useUser } from '../context/useUser'

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
  const { shifts } = useShift()
  const { userId } = useUser()

  // 篩選出該護理師有排班的班別
  const dutyShifts = shifts.filter((s) => s.nurseIds?.includes(userId))

  return (
    <div className="rounded-2xl bg-[#fafaf8] px-5 py-8 text-center ring-1 ring-black/5">
      {onRoster === false ? (
        <div className="space-y-4">
          <div className="text-lg font-extrabold text-slate-500 tracking-wide">
            休假中 非當班護士 無負責病患
          </div>
          <div className="mx-auto max-w-[100%] overflow-x-auto scrollbar-none rounded-xl bg-slate-100 p-5 leading-relaxed ring-1 ring-black/5">
            {dutyShifts.length > 0 ? (
              <p className="text-[#1e4ea7] font-bold text-sm md:text-base whitespace-nowrap">
                您的上班時間：{dutyShifts.map((s) => s.label).join('、')}
              </p>
            ) : (
              <p className="text-slate-500 font-bold text-sm md:text-base whitespace-nowrap">您的上班時間：本週暫無排班</p>
            )}
          </div>
        </div>
      ) : (
        <>
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
          {onRoster === true ? (
            <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-slate-600">
              {nurseName} <strong className="font-semibold text-slate-800">有在此班值班</strong>，但尚未完成分床分配。
              請至「指派分床配對」套用系統建議分床，或請管理者執行 demo 分床 seed。
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-slate-600">
              「我的病患」只顯示分床後指派給 {nurseName} 的床位，不是整班全部病人。
            </p>
          )}
        </>
      )}
    </div>
  )
}
