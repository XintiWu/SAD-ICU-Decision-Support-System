import { INITIAL_BY_NURSE, NURSES, PATIENTS } from '../data/allocationMock'
import type { NurseId, PatientId } from '../data/allocationMock'

export function AllocationResultPage() {
  const byNurse = INITIAL_BY_NURSE

  const nurseIds = Object.keys(NURSES) as NurseId[]

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div>
          <div className="text-sm font-semibold text-slate-900">分工結果</div>
          <div className="mt-1 text-xs text-slate-600">病人與護理師配對清單（原型示意）</div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {nurseIds.map((nid) => (
            <NurseBlock key={nid} nurseId={nid} patientIds={byNurse[nid]} />
          ))}
        </div>
      </section>
    </div>
  )
}

function NurseBlock({ nurseId, patientIds }: { nurseId: NurseId; patientIds: PatientId[] }) {
  const nurse = NURSES[nurseId]
  const total = patientIds.reduce((acc, pid) => acc + PATIENTS[pid].score, 0)

  return (
    <div className="rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{nurse.label}</div>
          <div className="mt-1 text-xs text-slate-600">共 {patientIds.length} 床</div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-black/10">
          負荷 {total}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {patientIds.length === 0 ? (
          <div className="rounded-xl bg-white p-3 text-xs text-slate-500 ring-1 ring-black/5">尚無分配</div>
        ) : (
          patientIds.map((pid) => <PatientRow key={pid} patientId={pid} />)
        )}
      </div>
    </div>
  )
}

function PatientRow({ patientId }: { patientId: PatientId }) {
  const p = PATIENTS[patientId]
  const pill =
    p.tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : p.tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{p.label}</div>
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>{p.score}分</span>
    </div>
  )
}

