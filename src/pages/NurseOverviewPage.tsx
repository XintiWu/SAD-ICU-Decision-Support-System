import { useEffect, useMemo, useState } from 'react'
import { CURRENT_SHIFT_ID, apiGet, type ApiAdmission, type BurdenAssessment } from '../api/client'

type OverviewData = {
  onDutyCharge: { shortName: string }
  myPatients: ApiAdmission[]
  allPatients: ApiAdmission[]
}

export function NurseOverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [burdens, setBurdens] = useState<BurdenAssessment[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<OverviewData>(`/nurse/overview?shiftId=${CURRENT_SHIFT_ID}`),
      apiGet<BurdenAssessment[]>(`/burden-assessments?shiftId=${CURRENT_SHIFT_ID}&scope=all`),
    ])
      .then(([overviewData, burdenData]) => {
        setOverview(overviewData)
        setBurdens(burdenData)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '讀取資料失敗'))
  }, [])

  const burdenByAdmission = useMemo(
    () => new Map(burdens.map((b) => [b.admissionId, b])),
    [burdens],
  )

  if (error) return <Notice tone="bad" text={error} />
  if (!overview) return <Notice text="讀取中..." />

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">整體班別總覽</div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Kpi title="我當班病患" value={`${overview.myPatients.length}`} hint={`本班共有 ${overview.allPatients.length} 位病人`} />
          <Kpi title="當班小組長" value={overview.onDutyCharge.shortName} hint="負責統籌與支援調度" tone="mid" />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">我的病患</div>
        <div className="mt-4">
          <PatientsTable rows={overview.myPatients} burdenByAdmission={burdenByAdmission} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">本班全部病患</div>
        <div className="mt-4">
          <PatientsTable rows={overview.allPatients} burdenByAdmission={burdenByAdmission} />
        </div>
      </section>
    </div>
  )
}

function PatientsTable({
  rows,
  burdenByAdmission,
}: {
  rows: ApiAdmission[]
  burdenByAdmission: Map<string, BurdenAssessment>
}) {
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
            const burden = burdenByAdmission.get(p.admissionId)
            const level = burden?.score.level ?? '低'
            return (
              <tr key={p.admissionId} className="border-t border-black/10">
                <td className="px-4 py-3 font-semibold text-slate-900">{p.bedLabel}</td>
                <td className="px-4 py-3 text-slate-800">{p.diagnosis}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.sex}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.age}</td>
                <td className="px-4 py-3 text-slate-800">{p.attendingPhysician}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{burden?.score.totalScore ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelPill(level)}`}>{level}</span>
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

function Kpi({ title, value, hint, tone }: { title: string; value: string; hint: string; tone?: 'mid' }) {
  const pill = tone === 'mid' ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]' : 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10'
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

function Notice({ text, tone }: { text: string; tone?: 'bad' }) {
  return <div className={`rounded-2xl bg-white p-6 text-sm ring-1 ${tone === 'bad' ? 'text-[#b3341f] ring-[#f2b3a6]' : 'text-slate-600 ring-black/10'}`}>{text}</div>
}
