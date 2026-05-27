import { useMemo, useState } from 'react'
import { NURSES, PATIENTS, type NurseId } from '../data/allocationMock'
import {
  getAllocationByNurse,
  getDemoPatients,
  getDemoStatOrders,
  objectiveTotal,
  subjectiveTotal,
  type StatOrder,
  type StatOrderKind,
} from '../state/demoStore'
import { nurseLoadTone } from '../components/allocation/allocationUtils'

function bedKeyFromLabel(label: string) {
  const m = label.match(/^床\s*(\d+)/)
  return m ? `床 ${m[1]}` : label
}

function bedNo(label: string) {
  const m = label.match(/^床\s*(\d+)/)
  return m ? Number(m[1]) : 0
}

function statusPill(total: number) {
  if (total >= 22) return { label: '高' as const, cls: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]' }
  if (total >= 14) return { label: '中' as const, cls: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]' }
  return { label: '低' as const, cls: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]' }
}

type BedAssignment = {
  bed: string
  patient: string
  objective: number
  subjective: number
  comprehensive: number
  level: '高' | '中' | '低'
}

type NurseCardModel = {
  nurseId: NurseId
  name: string
  load: number
  objective: number
  subjective: number
  tone: 'high' | 'mid' | 'low'
  assignments: BedAssignment[]
  statOrders: StatOrder[]
}

function buildNurseCards(): NurseCardModel[] {
  const byNurse = getAllocationByNurse()
  const patients = getDemoPatients()
  const patientByBed = new Map(patients.map((p) => [p.bedLabel, p]))
  const statOrders = getDemoStatOrders()

  return (Object.keys(NURSES) as NurseId[])
    .map((nurseId) => {
      const pids = byNurse[nurseId] ?? []
      const assignments: BedAssignment[] = []

      for (const pid of pids) {
        const mock = PATIENTS[pid]
        const bedKey = bedKeyFromLabel(mock.label)
        const demo = patientByBed.get(bedKey)
        const o = demo ? objectiveTotal(demo.objective) : 0
        const s = demo?.subjective ? subjectiveTotal(demo.subjective) : 0
        const comprehensive = o + s
        const level = statusPill(comprehensive).label

        assignments.push({
          bed: bedKey.replace(/^床\s*/, ''),
          patient: demo?.patientName ?? mock.label.replace(/^床\s*\d+\s*[—-]\s*/, ''),
          objective: o,
          subjective: s,
          comprehensive,
          level,
        })
      }

      assignments.sort((a, b) => Number(a.bed) - Number(b.bed))

      const assignedBeds = new Set(assignments.map((a) => `床 ${a.bed}`))
      const nurseStats = statOrders.filter((o) => assignedBeds.has(bedKeyFromLabel(o.bedLabel)))

      const objective = assignments.reduce((acc, a) => acc + a.objective, 0)
      const subjective = assignments.reduce((acc, a) => acc + a.subjective, 0)
      const load = objective + subjective

      return {
        nurseId,
        name: NURSES[nurseId].label,
        load,
        objective,
        subjective,
        tone: nurseLoadTone(load),
        assignments,
        statOrders: sortStatOrders(nurseStats),
      }
    })
    .filter((n) => n.assignments.length > 0)
    .sort((a, b) => b.load - a.load)
}

function sortStatOrders(orders: StatOrder[]) {
  return [...orders].sort((a, b) => bedNo(a.bedLabel) - bedNo(b.bedLabel) || a.orderedAt.localeCompare(b.orderedAt))
}

export function WarRoomPage() {
  const nurses = useMemo(() => buildNurseCards(), [])
  const allStat = useMemo(() => getDemoStatOrders(), [])

  const totalStat = allStat.length
  const nursesWithStat = nurses.filter((n) => n.statOrders.length > 0).length
  const highCount = nurses.filter((n) => n.tone === 'high').length
  const midCount = nurses.filter((n) => n.tone === 'mid').length
  const lowCount = nurses.filter((n) => n.tone === 'low').length
  const avgLoad = nurses.length ? Math.round((nurses.reduce((acc, n) => acc + n.load, 0) / nurses.length) * 10) / 10 : 0

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#eef2ff] via-[#f5fbff] to-[#ecfeff] ring-1 ring-black/10 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_0_0_1px_rgba(2,6,23,0.04)_inset]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1d4ed8] via-[#0ea5e9] to-[#14b8a6]" />
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide text-slate-600">全體概況 OVERVIEW</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">STAT 醫囑與綜合負擔（客觀＋主觀）</div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-800 ring-1 ring-black/10">
                護理師 <span className="ml-1 text-sm font-extrabold text-slate-900">{nurses.length}</span>
              </span>
              <span className="rounded-full bg-[#ffe8e1] px-3 py-1.5 font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">
                STAT <span className="ml-1 text-sm font-extrabold">{totalStat}</span>
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewKpi label="STAT 總數" value={`${totalStat}`} hint="本班突發醫囑" tone={totalStat ? 'danger' : 'ok'} />
            <OverviewKpi label="有 STAT 護理師" value={`${nursesWithStat}`} hint={`共 ${nurses.length} 位`} tone={nursesWithStat ? 'mid' : 'ok'} />
            <OverviewKpi label="平均綜合負擔" value={`${avgLoad}`} hint="客觀＋主觀" tone="mid" />
            <OverviewKpi
              label="負擔分布"
              value={`${highCount}/${midCount}/${lowCount}`}
              hint="高/中/低"
              tone={highCount ? 'danger' : midCount ? 'mid' : 'ok'}
            />
          </div>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {nurses.map((n) => (
            <NurseLoadCard key={n.nurseId} nurse={n} />
          ))}
        </div>
      </section>
    </div>
  )
}

function NurseLoadCard({ nurse }: { nurse: NurseCardModel }) {
  const [expanded, setExpanded] = useState(false)
  const { name, load, objective, subjective, tone, assignments, statOrders } = nurse

  const bar = tone === 'high' ? 'bg-[#c64a2c]' : tone === 'mid' ? 'bg-[#d88b2c]' : 'bg-[#2f7a44]'
  const pill =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
  const burdenLabel = tone === 'high' ? '高' : tone === 'mid' ? '中' : '低'

  const pct = Math.min(100, Math.round((load / 40) * 100))
  const preview = statOrders.slice(0, 3)

  const statByBed = statOrders.reduce<Record<string, StatOrder[]>>((acc, o) => {
    const key = bedKeyFromLabel(o.bedLabel).replace(/^床\s*/, '')
    if (!acc[key]) acc[key] = []
    acc[key].push(o)
    return acc
  }, {})

  const bedOrder = [...new Set([...assignments.map((a) => a.bed), ...Object.keys(statByBed)])].sort(
    (a, b) => Number(a) - Number(b),
  )

  const assignmentByBed = new Map(assignments.map((a) => [a.bed, a]))

  return (
    <section className="flex flex-col rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/10">
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-black/5">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
            <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 ring-1 ring-black/10">
              客觀 {objective}
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 font-semibold text-slate-700 ring-1 ring-black/10">
              主觀 {subjective}
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold text-slate-900 ring-1 ring-black/10">
              綜合 {load}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${pill}`}>負擔{burdenLabel}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] font-semibold text-slate-500">綜合</div>
          <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{load}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-black/10">
          <div className="min-w-0 text-[11px] font-semibold text-slate-700">
            床位：{assignments.length ? assignments.map((a) => `床 ${a.bed}`).join('、') : '—'}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-slate-50"
            aria-expanded={expanded}
          >
            {expanded ? '收起細節' : '展開細節'}
          </button>
        </div>


        {!expanded ? (
          <div className="grid gap-1.5">
            {preview.length ? (
              preview.map((o) => (
                <StatOrderRow key={o.id} order={o} compact />
              ))
            ) : (
              <div className="rounded-xl bg-surface px-3 py-2 text-xs text-slate-600 ring-1 ring-black/10">
                目前無 STAT 醫囑
              </div>
            )}
            {statOrders.length > preview.length ? (
              <div className="text-center text-[11px] font-semibold text-slate-500">
                還有 {statOrders.length - preview.length} 筆 STAT
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-2.5">
            {bedOrder.map((bed) => {
              const assign = assignmentByBed.get(bed)
              const bedStats = statByBed[bed] ?? []
              const bedStatus = assign ? statusPill(assign.comprehensive) : null

              return (
                <section key={bed} className="overflow-hidden rounded-xl bg-surface ring-1 ring-black/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-white px-2.5 py-2">
                    <div className="min-w-0 text-xs font-extrabold tracking-wide text-slate-900">
                      床 {bed}
                      <span className="ml-2 font-semibold text-slate-600">{assign?.patient ?? ''}</span>
                    </div>
                    {assign ? (
                      <div className="flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="rounded-full bg-surface px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-black/10">
                          客 {assign.objective}
                        </span>
                        <span className="rounded-full bg-surface px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-black/10">
                          主 {assign.subjective}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-extrabold text-slate-900 ring-1 ring-black/10">
                          綜 {assign.comprehensive}
                        </span>
                        {bedStatus ? (
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${bedStatus.cls}`}>{bedStatus.label}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {bedStats.length ? (
                    <ul className="grid max-h-52 gap-1.5 overflow-y-auto p-2 pr-1">
                      {bedStats.map((o) => (
                        <li key={o.id}>
                          <StatOrderRow order={o} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-2.5 py-2 text-[11px] text-slate-500">此床無 STAT 醫囑</div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function StatOrderRow({ order, compact }: { order: StatOrder; compact?: boolean }) {
  return (
    <div
      className={[
        'rounded-xl bg-white ring-1',
        compact ? 'px-3 py-2 ring-black/10' : 'p-2.5 ring-[#f1c4b8]',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-md bg-[#b3341f] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
          STAT
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-slate-900 ${compact ? 'truncate text-xs' : 'text-xs leading-snug'}`}>
            {order.title}
          </div>
          <div className={`mt-1 text-slate-600 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
            {order.orderedBy} · {order.orderedAt} 開立
          </div>
          {!compact && order.reason ? (
            <div className="mt-1 text-[11px] text-[#9a3412]">{order.reason}</div>
          ) : null}
        </div>
        <KindPill kind={order.kind} />
      </div>
    </div>
  )
}

function KindPill({ kind }: { kind: StatOrderKind }) {
  const map: Record<StatOrderKind, string> = {
    檢查: 'bg-sky-100 text-sky-800',
    治療: 'bg-violet-100 text-violet-800',
    給藥: 'bg-emerald-100 text-emerald-800',
    監測: 'bg-amber-100 text-amber-800',
    其他: 'bg-slate-100 text-slate-700',
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[kind]}`}>{kind}</span>
  )
}

function OverviewKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: 'ok' | 'mid' | 'danger'
}) {
  const pill =
    tone === 'danger'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'

  return (
    <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-black/10">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill}`}>{hint}</span>
      </div>
    </div>
  )
}
