import {
  getDemoPatients,
  getAssignedBedLabelsForCurrentNurse,
  getOnDutyCharge,
  objectiveTotal,
  subjectiveTotal,
  type Patient,
} from '../state/demoStore'

export function NurseOverviewPage() {
  const allPatients = getDemoPatients()
  const assignedBeds = new Set(getAssignedBedLabelsForCurrentNurse())
  const myPatients = allPatients.filter((p) => assignedBeds.has(p.bedLabel))
  const onDutyCharge = getOnDutyCharge()
  const mySplitAt = Math.ceil(myPatients.length / 2)
  const myLeft = myPatients.slice(0, mySplitAt)
  const myRight = myPatients.slice(mySplitAt)

  const allSplitAt = Math.ceil(allPatients.length / 2)
  const allLeft = allPatients.slice(0, allSplitAt)
  const allRight = allPatients.slice(allSplitAt)

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">整體班別總覽</div>
            <div className="mt-1 text-xs text-slate-600">一頁掌握：我的分配床位、負荷與本班概況</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Kpi
            title="我當班病患"
            value={`${myPatients.length}`}
            hint={`本班共有 ${allPatients.length} 位病人`}
          />
          <Kpi
            title="當班小組長"
            value={onDutyCharge}
            hint="負責統籌與支援調度"
            tone="mid"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">我的病患</div>
          </div>
        </div>

        {myPatients.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-[#fafaf8] p-4 text-sm text-slate-600 ring-1 ring-black/5">
            目前尚未分配到病患（請至「分工結果」確認分配）
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <PatientsTable rows={myLeft} />
            <PatientsTable rows={myRight} />
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">本班全部病患</div>
          </div>
        </div>

        {allPatients.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-[#fafaf8] p-4 text-sm text-slate-600 ring-1 ring-black/5">
            本班目前沒有病患資料
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <PatientsTable rows={allLeft} />
            <PatientsTable rows={allRight} />
          </div>
        )}
      </section>
    </div>
  )
}

function PatientsTable({ rows }: { rows: Patient[] }) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-black/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#fafaf8] text-xs text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">床號</th>
            <th className="px-4 py-3 font-semibold">診斷</th>
            <th className="px-4 py-3 font-semibold">性別</th>
            <th className="px-4 py-3 font-semibold">年齡</th>
            <th className="px-4 py-3 font-semibold">主治醫師</th>
            <th className="px-4 py-3 font-semibold">負擔總分</th>
            <th className="px-4 py-3 font-semibold">負荷等級</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const o = objectiveTotal(p.objective)
            const s = p.subjective ? subjectiveTotal(p.subjective) : null
            const total = o + (s ?? 0)
            const level = total >= 22 ? '高' : total >= 14 ? '中' : '低'
            return (
              <tr key={p.bedId} className="border-t border-black/10">
                <td className="px-4 py-3 font-semibold text-slate-900">{p.bedLabel}</td>
                <td className="px-4 py-3 text-slate-800">{p.diagnosis}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.sex}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.age}</td>
                <td className="px-4 py-3 text-slate-800">{p.attendingPhysician}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{total}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelPill(level)}`}>
                    {level}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function levelPill(level: '高' | '中' | '低') {
  if (level === '高') return 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
  if (level === '中') return 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
  return 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
}

function Kpi({
  title,
  value,
  hint,
  tone,
}: {
  title: string
  value: string
  hint: string
  tone?: 'high' | 'mid'
}) {
  const pill =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10'
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>本班</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">{hint}</div>
    </div>
  )
}

