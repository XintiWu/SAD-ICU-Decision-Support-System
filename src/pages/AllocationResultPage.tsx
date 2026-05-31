import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, type BurdenAssessment, type HandoffData } from '../api/client'
import { burdenSummaryText } from '../lib/burdenDisplay'
import { formatNurseByShortName, formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/ShiftContext'

type OverviewMeta = {
  onDutyCharge: { id?: string; shortName: string }
}

export function AllocationResultPage() {
  const { shiftId, selectedShift } = useShift()
  const [rows, setRows] = useState<HandoffData['rows']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chargeName, setChargeName] = useState<string | null>(null)
  const [burdens, setBurdens] = useState<BurdenAssessment[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setRows([])

    const load = () => {
      Promise.all([
        apiGet<HandoffData>(`/handoff-sheets?shiftId=${shiftId}`),
        apiGet<OverviewMeta>(`/nurse/overview?shiftId=${shiftId}`),
        apiGet<BurdenAssessment[]>(`/burden-assessments?shiftId=${shiftId}&scope=all`),
      ])
        .then(([handoff, overview, burdenRows]) => {
          if (!alive) return
          setRows(handoff.rows)
          setChargeName(overview.onDutyCharge?.shortName ?? null)
          setBurdens(burdenRows)
          setUpdatedAt(new Date().toISOString())
          setError(null)
        })
        .catch((err: Error) => {
          if (!alive) return
          setError(err.message)
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }

    load()
    const timer = window.setInterval(load, 5000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [shiftId])

  const burdenByAdmission = useMemo(
    () => new Map(burdens.map((b) => [b.admissionId, b])),
    [burdens],
  )

  const stats = useMemo(() => {
    const changed = rows.filter((row) => row.currentNurse !== row.nextNurse).length
    const high = rows.filter((row) => row.burdenScore >= 22).length
    return { changed, high, total: rows.length }
  }, [rows])

  const chargeLabel = chargeName
    ? formatNurseDisplay(chargeName, { role: 'charge_nurse' })
    : '—'

  if (loading) return <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-700 ring-1 ring-black/10">載入交班表...</div>
  if (error) return <div className="rounded-2xl bg-[#ffe8e1] p-5 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">{error}</div>

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
        <div className="text-lg font-extrabold tracking-tight text-slate-900">交班分床結果</div>
        {selectedShift ? (
          <div className="mt-1 text-sm font-medium text-slate-600">{selectedShift.label}</div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span>
            <span className="font-semibold text-slate-800">分床結果時間</span> {updatedAt ? formatDateTime(updatedAt) : '—'}
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span>
            <span className="font-semibold text-slate-800">小組長</span> {chargeLabel}
          </span>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Kpi label="交班床數" value={stats.total} />
        <Kpi label="高負擔" value={stats.high} tone={stats.high ? 'danger' : 'ok'} />
        <Kpi label="護理師異動" value={stats.changed} tone={stats.changed ? 'mid' : 'ok'} />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/10">
        <table className="min-w-[1320px] w-full table-fixed text-left text-sm">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-[#fafaf8] text-xs text-slate-600">
            <tr className="border-b border-black/10">
              <Th>床位</Th>
              <Th>主治醫師</Th>
              <Th>病人姓名</Th>
              <Th>性別</Th>
              <Th>年齡</Th>
              <Th>住院日期</Th>
              <Th>本班護理師</Th>
              <Th>麻煩度</Th>
              <Th>麻煩度細項</Th>
              <Th>交班診斷</Th>
              <Th>下班護理師</Th>
            </tr>
          </thead>
          <tbody className="bg-[#fafaf8]">
            {rows.map((row) => {
              const burdenDetail = burdenSummaryText(burdenByAdmission.get(row.admissionId))
              return (
                <tr key={row.admissionId} className="border-t border-black/10">
                  <Td strong>{row.bedLabel}</Td>
                  <Td>{row.attendingPhysician}</Td>
                  <Td strong>{row.patientName}</Td>
                  <Td strong>{row.sex}</Td>
                  <Td strong>{row.age}</Td>
                  <Td>{formatDate(row.admittedAt)}</Td>
                  <Td strong>{formatNurseByShortName(row.currentNurse, chargeName)}</Td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${burdenPill(row.burdenScore)}`}>{row.burdenScore}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-700">
                    <span className="line-clamp-2" title={burdenDetail}>
                      {burdenDetail}
                    </span>
                  </td>
                  <Td>{row.handoffDiagnosis}</Td>
                  <Td strong>{formatNurseByShortName(row.nextNurse, chargeName)}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone = 'ok' }: { label: string; value: number; tone?: 'ok' | 'mid' | 'danger' }) {
  const color = tone === 'danger' ? 'text-[#b3341f]' : tone === 'mid' ? 'text-[#9a5b1a]' : 'text-slate-900'
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold tracking-tight ${color}`}>{value}</div>
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>
}

function Td({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <td className={`px-4 py-3 whitespace-nowrap ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      <span className="block truncate" title={String(children)}>
        {children}
      </span>
    </td>
  )
}

function burdenPill(score: number) {
  if (score >= 22) return 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
  if (score >= 14) return 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
  return 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
