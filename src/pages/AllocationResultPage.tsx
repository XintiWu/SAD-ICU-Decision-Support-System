import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type HandoffData } from '../api/client'
import { formatNurseByShortName, formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/useShift'

type OverviewMeta = {
  onDutyCharge: { id?: string; shortName: string }
}

export function AllocationResultPage() {
  const { shiftId } = useShift()
  return <AllocationResultPageBody key={shiftId} shiftId={shiftId} />
}

function AllocationResultPageBody({ shiftId }: { shiftId: string }) {
  const { selectedShift } = useShift()
  const [handoff, setHandoff] = useState<HandoffData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chargeName, setChargeName] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    Promise.all([
      apiGet<HandoffData>(`/handoff-sheets?shiftId=${shiftId}`),
      apiGet<OverviewMeta>(`/nurse/overview?shiftId=${shiftId}`),
    ])
      .then(([handoffData, overview]) => {
        if (!alive) return
        setHandoff(handoffData)
        setChargeName(overview.onDutyCharge?.shortName ?? null)
        setError(null)
      })
      .catch((err: Error) => {
        if (!alive) return
        setError(err.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [shiftId])

  const stats = useMemo(() => {
    const rows = handoff?.rows ?? []
    const changed = rows.filter((row) => row.currentNurse !== row.nextNurse).length
    const high = rows.filter((row) => row.burdenScore >= 22).length
    return { changed, high, total: rows.length }
  }, [handoff?.rows])

  const rows = handoff?.rows ?? []

  const chargeLabel = chargeName
    ? formatNurseDisplay(chargeName, { role: 'charge_nurse' })
    : '—'
  if (loading) return <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-700 ring-1 ring-black/10">載入交班表...</div>
  if (error) return <div className="rounded-2xl bg-[#ffe8e1] p-5 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">{error}</div>

  if (!handoff?.snapshotId) {
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
          <div className="text-lg font-extrabold tracking-tight text-slate-900">交班分床結果</div>
          {selectedShift ? (
            <div className="mt-1 text-sm font-medium text-slate-600">{selectedShift.label}</div>
          ) : null}
        </div>
        <div className="rounded-2xl bg-surface p-8 text-center ring-1 ring-black/10">
          <div className="text-sm font-semibold text-slate-900">此班別尚無已封存的交班快照</div>
          {selectedShift ? (
            <p className="mt-2 text-sm font-medium text-slate-700">{selectedShift.label}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-600">
            交班表僅顯示<strong className="font-semibold text-slate-800">該班別</strong>確認分床當下封存的資料。請至{' '}
            <Link to="/leader/allocation" className="font-semibold text-[#1e4ea7] underline underline-offset-2">
              指派分床配對
            </Link>{' '}
            完成確認，或切換至已有快照的班別（demo：2026/05/08 白班）。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
        <div className="text-lg font-extrabold tracking-tight text-slate-900">交班分床結果</div>
        {selectedShift ? (
          <div className="mt-1 text-sm font-medium text-slate-600">{selectedShift.label}</div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
          <span>
            <span className="font-semibold text-slate-800">封存時間</span>{' '}
            {handoff.createdAt ? formatDateTime(handoff.createdAt) : '—'}
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span>
            <span className="font-semibold text-slate-800">小組長</span> {chargeLabel}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">以下內容為確認分床當下封存的交班資料，不會隨後續修改而變動。</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Kpi label="交班床數" value={stats.total} />
        <Kpi label="高負擔" value={stats.high} tone={stats.high ? 'danger' : 'ok'} />
        <Kpi label="護理師異動" value={stats.changed} tone={stats.changed ? 'mid' : 'ok'} />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/10">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-[#fafaf8] text-xs text-slate-600">
            <tr className="border-b border-black/10">
              <Th className="w-[4.5rem]">床位</Th>
              <Th className="w-[5.5rem]">主治醫師</Th>
              <Th className="w-[5rem]">病人姓名</Th>
              <Th className="w-[2.5rem]">性別</Th>
              <Th className="w-[2.5rem]">年齡</Th>
              <Th className="w-[6rem]">住院日期</Th>
              <Th className="w-[5rem]">本班護理師</Th>
              <Th className="w-[4.5rem]">麻煩度</Th>
              <Th className="min-w-[18rem]">麻煩度細項</Th>
              <Th className="min-w-[16rem]">交班診斷</Th>
              <Th className="w-[5rem]">下班護理師</Th>
            </tr>
          </thead>
          <tbody className="bg-[#fafaf8]">
            {rows.map((row) => {
              const objScore = row.objectiveScore ?? row.burdenScore
              const subScore = row.subjectiveScore ?? 0
              return (
                <tr key={row.admissionId} className="border-t border-black/10">
                  <Td strong>{row.bedLabel}</Td>
                  <Td>{row.attendingPhysician}</Td>
                  <Td strong>{row.patientName}</Td>
                  <Td strong>{row.sex}</Td>
                  <Td strong>{row.age}</Td>
                  <Td>{formatDate(row.admittedAt)}</Td>
                  <Td strong>{formatNurseByShortName(row.currentNurse, chargeName)}</Td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <ScoreHoverTooltip objective={objScore} subjective={subScore}>
                      <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${burdenPill(row.burdenScore)}`}>
                        {row.burdenScore}
                      </span>
                    </ScoreHoverTooltip>
                  </td>
                  <TdLong text={row.burdenDetail}>{row.burdenDetail}</TdLong>
                  <TdLong text={row.handoffDiagnosis}>{row.handoffDiagnosis}</TdLong>
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

function Th({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold whitespace-nowrap ${className}`}>{children}</th>
}

function Td({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <td className={`px-4 py-3 align-top whitespace-nowrap ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      {children}
    </td>
  )
}

function TdLong({ children }: { text: string; children: ReactNode }) {
  return (
    <td className="px-4 py-3 align-top text-xs text-slate-700">
      <div className="whitespace-normal break-words leading-relaxed">
        {children}
      </div>
    </td>
  )
}

function ScoreHoverTooltip({
  objective,
  subjective,
  children,
}: {
  objective: number
  subjective: number
  children: ReactNode
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  function handleEnter() {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ left: rect.left, top: rect.bottom + 6 })
    setOpen(true)
  }

  function handleLeave() {
    setOpen(false)
  }

  return (
    <>
      <div
        ref={anchorRef}
        className="inline-block cursor-help"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        tabIndex={0}
      >
        {children}
      </div>
      {open && pos
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[100] rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold leading-relaxed text-white shadow-xl ring-1 ring-black/20"
              style={{ left: pos.left, top: pos.top }}
              role="tooltip"
            >
              客觀 {objective} 分 · 主觀 {subjective} 分
            </div>,
            document.body,
          )
        : null}
    </>
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

