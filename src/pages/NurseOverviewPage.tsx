import { Link } from 'react-router-dom'
import {
  getDemoPatients,
  getHandoverItems,
  getLastHandoverAt,
  getLastHandoverBy,
  getNextHandoverAt,
  getDemoTasks,
  taskPoints,
  objectiveTotal,
  subjectiveTotal,
} from '../state/demoStore'

export function NurseOverviewPage() {
  const patients = getDemoPatients()
  const handover = getHandoverItems()
  const handoverAt = getLastHandoverAt()
  const handoverBy = getLastHandoverBy()
  const nextHandoverAt = getNextHandoverAt()
  const tasks = getDemoTasks()
  const pendingTasks = tasks.filter((t) => !t.done)
  const remainingPoints = pendingTasks.reduce((acc, t) => acc + taskPoints(t), 0)

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">我的班別總覽</div>
            <div className="mt-1 text-xs text-slate-600">一頁掌握：交班、待辦、負荷與本班病患</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/nurse/handover"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              交班
            </Link>
            <Link
              to="/nurse/todo"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              TO‑DO
            </Link>
            <Link
              to="/nurse/burden-form"
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
            >
              麻煩度評估
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <Kpi title="本班病患" value={String(patients.length)} hint="已分配床位數" />
          <Kpi
            title="任務（待完成）"
            value={`${pendingTasks.length}`}
            hint={`剩餘負荷 ${remainingPoints}`}
            tone={pendingTasks.length >= 6 ? 'high' : 'mid'}
          />
          <Kpi
            title="下一個交班時間"
            value={formatHHMM(nextHandoverAt)}
            hint={new Date(nextHandoverAt).toLocaleDateString()}
            tone="mid"
          />
          <Kpi
            title="上一班交班"
            value={handoverBy}
            hint={new Date(handoverAt).toLocaleString()}
            tone="mid"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">本班病患一覽</div>
            <div className="mt-1 text-xs text-slate-600">
              以「客觀五項 + 主觀三等級」計算負荷；內含欄位「上一班交班重點」
            </div>
            <div className="mt-2 text-xs text-slate-600">
              上一班交班者：<span className="font-semibold text-slate-800">{handoverBy}</span>
              <span className="ml-2 text-slate-500">{new Date(handoverAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/nurse/handover"
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              查看交班
            </Link>
            <Link
              to="/nurse/burden-form"
              className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90"
            >
              更新麻煩度
            </Link>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-black/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#fafaf8] text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">床號</th>
                <th className="px-4 py-3 font-semibold">診斷</th>
                <th className="px-4 py-3 font-semibold">上一班交班重點</th>
                <th className="px-4 py-3 font-semibold">客觀</th>
                <th className="px-4 py-3 font-semibold">主觀</th>
                <th className="px-4 py-3 font-semibold">總分</th>
                <th className="px-4 py-3 font-semibold">等級</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const o = objectiveTotal(p.objective)
                const s = p.subjective ? subjectiveTotal(p.subjective) : null
                const total = o + (s ?? 0)
                const level = total >= 22 ? '高' : total >= 14 ? '中' : '低'
                const h = handover.find((x) => x.bedLabel === p.bedLabel)
                return (
                  <tr key={p.bedId} className="border-t border-black/10">
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.bedLabel}</td>
                    <td className="px-4 py-3 text-slate-800">{p.diagnosis}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="line-clamp-2">{h?.summary ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{o}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{s ?? '—'}</td>
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
      </section>
    </div>
  )
}

function levelPill(level: '高' | '中' | '低') {
  if (level === '高') return 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
  if (level === '中') return 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
  return 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
}

function formatHHMM(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
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

