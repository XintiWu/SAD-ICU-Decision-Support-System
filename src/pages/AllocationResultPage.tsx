import { INITIAL_BY_NURSE, NEXT_BED_PATIENT, NEXT_BY_NURSE, NURSES, PATIENTS } from '../data/allocationMock'
import type { NurseId, PatientId } from '../data/allocationMock'
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { getDemoPatients, objectiveTotal, subjectiveTotal } from '../state/demoStore'
import type { Patient as DemoPatient } from '../state/demoStore'

export function AllocationResultPage() {
  const currentOwner = useMemo(() => invertByNurse(INITIAL_BY_NURSE), [])
  const nextOwner = useMemo(() => invertByNurse(NEXT_BY_NURSE), [])
  const patients = useMemo(() => getDemoPatients(), [])

  return (
    <HandoffSheetTable currentOwner={currentOwner} nextOwner={nextOwner} patients={patients} nextBedPatient={NEXT_BED_PATIENT} />
  )
}

function invertByNurse(byNurse: Record<NurseId, PatientId[]>) {
  const out = new Map<PatientId, NurseId>()
  for (const [nid, pids] of Object.entries(byNurse) as [NurseId, PatientId[]][]) {
    for (const pid of pids) out.set(pid, nid)
  }
  return out
}

type HandoffRow = {
  bed: string
  patient: DemoPatient
  attendingPhysician: string
  patientName: string
  sex: string
  age: number | string
  admittedAt: string
  currentNurse: string
  burdenScore: number
  handoffDiagnosis: string
  nextNurse: string
  nurseChanged: boolean
  diagnosisChanged: boolean
}

function buildHandoffRows({
  currentOwner,
  nextOwner,
  patients,
  nextBedPatient,
}: {
  currentOwner: Map<PatientId, NurseId>
  nextOwner: Map<PatientId, NurseId>
  patients: DemoPatient[]
  nextBedPatient: Record<string, string>
}): HandoffRow[] {
  const beds = new Set<string>([...patients.map((p) => p.bedLabel), ...Object.keys(nextBedPatient)])
  const out: HandoffRow[] = []

  const labelToPid = new Map<string, PatientId>()
  for (const [pid, p] of Object.entries(PATIENTS) as [PatientId, (typeof PATIENTS)[PatientId]][]) {
    const m = p.label.match(/^床\s*(\d+)\b/)
    if (m) labelToPid.set(`床 ${m[1]}`, pid)
  }

  const byBed = new Map<string, DemoPatient>()
  for (const p of patients) byBed.set(p.bedLabel, p)

  for (const bed of beds) {
    const pid = labelToPid.get(bed)
    const demo = byBed.get(bed)
    if (!pid || !demo) continue

    const o = objectiveTotal(demo.objective)
    const s = demo.subjective ? subjectiveTotal(demo.subjective) : 0
    const burdenScore = o + s

    const curNid = currentOwner.get(pid)
    const nextNid = nextOwner.get(pid)
    const currentNurse = curNid ? NURSES[curNid].shortName : '—'
    const nextNurse = nextNid ? NURSES[nextNid].shortName : '—'

    const nextLabel = nextBedPatient[bed]
    const nextDx = nextLabel ? extractDiagnosis(nextLabel) : null
    const handoffDiagnosis = nextDx ?? demo.diagnosis
    const nurseChanged = !!curNid && !!nextNid && curNid !== nextNid
    const diagnosisChanged = !!nextDx && nextDx !== demo.diagnosis

    out.push({
      bed,
      patient: demo,
      attendingPhysician: demo.attendingPhysician,
      patientName: demo.patientName,
      sex: demo.sex,
      age: demo.age,
      admittedAt: demo.admittedAt,
      currentNurse,
      burdenScore,
      handoffDiagnosis,
      nextNurse,
      nurseChanged,
      diagnosisChanged,
    })
  }

  out.sort((a, b) => bedNo(a.bed) - bedNo(b.bed))
  return out
}

type PopoverState =
  | {
      bed: string
      anchorRect: { left: number; top: number; width: number; height: number }
    }
  | null

function HandoffSheetTable({
  currentOwner,
  nextOwner,
  patients,
  nextBedPatient,
}: {
  currentOwner: Map<PatientId, NurseId>
  nextOwner: Map<PatientId, NurseId>
  patients: DemoPatient[]
  nextBedPatient: Record<string, string>
}) {
  const rows = useMemo(
    () => buildHandoffRows({ currentOwner, nextOwner, patients, nextBedPatient }),
    [currentOwner, nextOwner, patients, nextBedPatient],
  )
  const [popover, setPopover] = useState<PopoverState>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setPopover(null)
    }
    function onPointerDown(e: PointerEvent) {
      if (!popover) return
      const el = popoverRef.current
      if (!el) return
      if (el.contains(e.target as Node)) return
      setPopover(null)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [popover])

  return (
    <div className="rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/5">
      <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-black/10">
        <table className="min-w-[1200px] w-full table-fixed text-left text-sm">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '21%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="bg-[#fafaf8] text-xs text-slate-600">
            <tr className="border-b border-black/10">
              <th className="px-4 py-3 font-semibold whitespace-nowrap">床位</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">主治醫生</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">病人姓名</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">性別</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">年齡</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">住院日期</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">本班護理師</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">交班時麻煩度分數</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">交班時診斷</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">下個班別護理師</th>
            </tr>
          </thead>
          <tbody className="bg-[#fafaf8]">
            {rows.map((r) => (
              <tr key={`row:${r.bed}`} className="border-t border-black/10">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-base font-extrabold tracking-tight text-slate-900">{r.bed}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="block truncate" title={r.attendingPhysician}>
                    {r.attendingPhysician}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                  <span className="block truncate" title={r.patientName}>
                    {r.patientName}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.sex}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.age}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.admittedAt}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.currentNurse}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-extrabold ${burdenPill(r.burdenScore)} hover:brightness-[0.98]`}
                    title="查看分數細節"
                    onClick={(e) => {
                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                      setPopover({
                        bed: r.bed,
                        anchorRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                      })
                    }}
                    aria-label="查看分數細節"
                  >
                    {r.burdenScore}
                  </button>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                  <span className="block truncate" title={r.handoffDiagnosis}>
                    {r.handoffDiagnosis}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                  <span className="block truncate" title={r.nextNurse}>
                    {r.nextNurse}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {popover ? (
        <ScorePopover
          ref={popoverRef}
          row={rows.find((r) => r.bed === popover.bed) ?? null}
          anchorRect={popover.anchorRect}
          onClose={() => setPopover(null)}
        />
      ) : null}
    </div>
  )
}

function burdenPill(score: number) {
  const tone = score >= 22 ? 'high' : score >= 14 ? 'mid' : 'low'
  if (tone === 'high') return 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
  if (tone === 'mid') return 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
  return 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
}

function bedNo(bed: string) {
  const m = bed.match(/(\d+)/)
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

function extractDiagnosis(label: string) {
  const s = label.replace(/\s+/g, ' ').trim()
  const parts = s.split(/[—-]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.slice(1).join(' — ')
  return s
}

type ScoreItem = { label: string; points: number }

function objectiveBreakdown(p: DemoPatient): ScoreItem[] {
  return Object.entries(p.objective)
    .map(([label, points]) => ({ label, points }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points)
}

function subjectiveBreakdown(p: DemoPatient): ScoreItem[] {
  const s = p.subjective
  if (!s) return []
  const out: ScoreItem[] = []
  const add = (label: string, points: number) => {
    if (points > 0) out.push({ label, points })
  }

  const rass = s['RASS 鎮靜分數（原始數值）']
  const rassPoints = (() => {
    if (rass == null || Number.isNaN(rass)) return 0
    const a = Math.abs(rass)
    if (a <= 1) return 0
    if (a <= 3) return 1
    return 2
  })()
  add('RASS 鎮靜分數', rassPoints)
  add('躁動且有下床風險', s['躁動且有下床風險'] ? 2 : 0)
  add('躁動且有拔管風險', s['躁動且有拔管風險'] ? 2 : 0)
  add('引流管', s['引流管'] ? 2 : 0)
  add('需人工管灌', s['需人工管灌'] ? 2 : 0)
  add('換藥頻繁程度', s['換藥頻繁程度'])
  add('生理狀態監測頻繁程度', s['生理狀態監測頻繁程度'])
  return out.sort((a, b) => b.points - a.points)
}

const ScorePopover = forwardRef<
  HTMLDivElement,
  { row: HandoffRow | null; anchorRect: { left: number; top: number; width: number; height: number }; onClose: () => void }
>(function ScorePopoverInner({ row, anchorRect, onClose }, ref) {
  if (!row) return null
  const p = row.patient
  const oItems = objectiveBreakdown(p)
  const sItems = subjectiveBreakdown(p)
  const oTotal = objectiveTotal(p.objective)
  const sTotal = p.subjective ? subjectiveTotal(p.subjective) : 0
  const total = oTotal + sTotal

  const width = 360
  const margin = 12
  const preferredLeft = anchorRect.left + anchorRect.width / 2 - width / 2
  const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin))
  const top = Math.min(anchorRect.top + anchorRect.height + 10, window.innerHeight - margin)

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[360px] rounded-2xl bg-white p-4 text-sm shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] ring-1 ring-black/10"
      style={{ left, top }}
      role="dialog"
      aria-label="分數細節"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-600">交班時麻煩度分數</div>
          <div className="mt-1 truncate text-sm font-extrabold text-slate-900" title={`${row.bed} ${row.patientName}`}>
            {row.bed} {row.patientName}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-slate-50"
        >
          關閉
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <KpiMini label="客觀" value={`${oTotal}`} />
        <KpiMini label="主觀" value={`${sTotal}`} />
        <KpiMini label="合計" value={`${total}`} strong />
      </div>

      <div className="mt-3 grid gap-3">
        <ScoreSection title="客觀因子（Top）" items={oItems.slice(0, 6)} emptyText="目前無加分因子" />
        <ScoreSection title="主觀因子（Top）" items={sItems.slice(0, 6)} emptyText="目前無主觀加分" />
      </div>
    </div>
  )
})

function KpiMini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-3 ring-1 ring-black/5">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className={`mt-1 text-lg font-extrabold tracking-tight ${strong ? 'text-slate-900' : 'text-slate-800'}`}>{value}</div>
    </div>
  )
}

function ScoreSection({ title, items, emptyText }: { title: string; items: ScoreItem[]; emptyText: string }) {
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-3 ring-1 ring-black/5">
      <div className="text-xs font-extrabold text-slate-800">{title}</div>
      {items.length === 0 ? (
        <div className="mt-2 text-xs font-semibold text-slate-600">{emptyText}</div>
      ) : (
        <div className="mt-2 grid gap-1">
          {items.map((it) => (
            <div key={`${title}:${it.label}`} className="flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1 truncate font-semibold text-slate-700" title={it.label}>
                {it.label}
              </div>
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 font-extrabold text-slate-800 ring-1 ring-black/10">
                +{it.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

