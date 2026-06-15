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
          <div className="mx-auto max-w-[100%] rounded-xl bg-slate-100 p-4 leading-relaxed ring-1 ring-black/5">
            {dutyShifts.length > 0 ? (
              <div className="flex flex-wrap gap-2 justify-center items-center">
                <span className="text-slate-600 font-bold text-sm">您的上班時間：</span>
                {dutyShifts.map((s) => (
                  <span key={s.id} className="inline-flex items-center rounded-lg bg-[#eaf1ff] px-3 py-1 text-xs font-semibold text-[#1e4ea7] ring-1 ring-[#1e4ea7]/20">
                    {s.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 font-bold text-sm text-center">您的上班時間：本週暫無排班</p>
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
              <br />
              請至上一班的「指派分床配對」套用系統建議分床。
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
