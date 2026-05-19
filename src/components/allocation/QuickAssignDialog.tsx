import { NURSES, type NurseId, type PatientId } from '../../data/allocationMock'
import { enrichBed } from './allocationUtils'

type Props = {
  patientId: PatientId
  nurseIds: NurseId[]
  loads: Record<NurseId, number>
  onSelect: (nurseId: NurseId | 'unassigned') => void
  onClose: () => void
}

export function QuickAssignDialog({ patientId, nurseIds, loads, onSelect, onClose }: Props) {
  const bed = enrichBed(patientId)

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">快速指派</h3>
            <p className="mt-1 text-xs text-slate-600">
              {bed.bedLabel} · {bed.diagnosis}（{bed.score} 分）
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-black/5"
            onClick={onClose}
          >
            關閉
          </button>
        </div>
        <div className="mt-4 grid max-h-[50vh] gap-1 overflow-y-auto">
          <AssignRow label="未分配" load={null} onClick={() => onSelect('unassigned')} />
          {nurseIds.map((nid) => (
            <AssignRow
              key={nid}
              label={NURSES[nid].shortName}
              load={loads[nid]}
              onClick={() => onSelect(nid)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function AssignRow({ label, load, onClick }: { label: string; load: number | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-[#fafaf8] ring-1 ring-transparent hover:ring-black/5"
    >
      <span>{label}</span>
      {load != null ? <span className="text-xs font-medium text-slate-500">目前負荷 {load}</span> : null}
    </button>
  )
}
