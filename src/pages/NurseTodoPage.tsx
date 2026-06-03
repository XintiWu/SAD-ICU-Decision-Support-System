import { useEffect, useMemo, useState } from 'react'
import { apiGet, type ApiStatOrder } from '../api/client'
import { useShift } from '../context/useShift'
import { useUser } from '../context/useUser'

type StatOrderKind = ApiStatOrder['kind']
const KINDS: StatOrderKind[] = ['檢查', '治療', '給藥', '監測', '其他']

const KIND_WEIGHT: Record<StatOrderKind, number> = {
  治療: 4, 給藥: 3, 檢查: 2, 監測: 1, 其他: 1,
}

export function NurseTodoPage() {
  const { shiftId } = useShift()
  return <NurseTodoPageBody key={shiftId} shiftId={shiftId} />
}

function NurseTodoPageBody({ shiftId }: { shiftId: string }) {
  const { userId } = useUser()
  const [kindFilter, setKindFilter] = useState<Set<StatOrderKind>>(new Set())
  const [orders, setOrders] = useState<ApiStatOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedBeds, setExpandedBeds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    apiGet<ApiStatOrder[]>(
      `/stat-orders?shiftId=${shiftId}&assignee=me&includeCompleted=true`,
      { userId },
    )
      .then((data) => {
        if (!alive) return
        setOrders(sortByOrderedAt(data))
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
  }, [shiftId, userId])

  const shown = useMemo(() => {
    if (kindFilter.size === 0) return orders
    return orders.filter((o) => kindFilter.has(o.kind))
  }, [kindFilter, orders])

  const countByKind = useMemo(() => {
    const map = new Map<StatOrderKind, number>()
    for (const k of KINDS) map.set(k, 0)
    for (const o of orders) map.set(o.kind, (map.get(o.kind) ?? 0) + 1)
    return map
  }, [orders])

  const patientStats = useMemo(() => buildPatientStats(orders), [orders])
  const patientCount = patientStats.length

  const oldestMinutes = useMemo(() => minutesSinceOldest(orders), [orders])

  const beds = useMemo(() => groupByBed(shown), [shown])
  const weightByBed = useMemo(() => {
    const map = new Map<string, number>()
    for (const { bedLabel, weight } of patientStats) map.set(bedLabel, weight)
    return map
  }, [patientStats])

  if (loading) return (
    <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-black/10">載入 STAT 醫囑中…</div>
  )
  if (error) return (
    <div className="rounded-2xl bg-[#ffe8e1] p-5 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">{error}</div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">突發立即性醫囑 STAT TODO</div>
            <div className="mt-1 text-xs text-slate-600">
              顯示本班您負責病患的 STAT 醫囑；僅供提醒，不受戰情室勾選影響
            </div>
          </div>
          <div className="rounded-full bg-[#ffe8e1] px-3 py-1.5 text-xs font-semibold text-[#b3341f]">
            共 {orders.length} 筆 STAT
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-surface p-3 ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">類型篩選</span>
            {kindFilter.size > 0 ? (
              <button
                type="button"
                onClick={() => setKindFilter(new Set())}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#1e4ea7] hover:bg-[#e6f0ff]"
              >
                清除篩選
              </button>
            ) : (
              <span className="text-[11px] text-slate-500">點選標籤篩選類型</span>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <KindFilterPill
                key={k}
                kind={k}
                active={kindFilter.has(k)}
                onClick={() =>
                  setKindFilter((prev) => {
                    const next = new Set(prev)
                    if (next.has(k)) next.delete(k)
                    else next.add(k)
                    return next
                  })
                }
              />
            ))}
          </div>
          {kindFilter.size > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-2.5">
              <span className="text-[11px] font-medium text-slate-500">已選</span>
              {[...kindFilter].map((k) => (
                <KindPill key={k} kind={k} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {beds.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">
              {kindFilter.size > 0 ? '目前無符合類型篩選的 STAT 醫囑' : '本班目前沒有 STAT 醫囑'}
            </p>
          ) : null}
          {beds.map(([bedLabel, items]) => {
            const isExpanded = expandedBeds.has(bedLabel)
            const visibleCount = isExpanded ? items.length : Math.min(4, items.length)
            const hiddenCount = Math.max(0, items.length - visibleCount)
            const visibleItems = items.slice(0, visibleCount)

            return (
              <div key={bedLabel} className="rounded-2xl bg-surface p-3 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{bedLabel}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {items.length} 筆 STAT
                      {weightByBed.has(bedLabel) ? (
                        <span className="text-[#9a5b1a]"> · 加權 {weightByBed.get(bedLabel)}</span>
                      ) : null}
                    </div>
                  </div>
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBeds((prev) => {
                          const next = new Set(prev)
                          if (next.has(bedLabel)) next.delete(bedLabel)
                          else next.add(bedLabel)
                          return next
                        })
                      }
                      className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5"
                    >
                      +{hiddenCount} 更多
                    </button>
                  ) : null}
                </div>

                <ul className="mt-2 grid gap-1.5">
                  {visibleItems.map((o) => (
                    <li key={o.id} className="rounded-xl bg-white p-3 ring-1 ring-[#f1c4b8]">
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 rounded-md bg-[#b3341f] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                          STAT
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-900">{o.title}</div>
                          <div className="mt-1 text-xs text-slate-600">
                            {o.orderedBy} · {o.orderedAt} 開立
                          </div>
                          {o.reason ? (
                            <div className="mt-1 text-xs text-[#9a3412]">{o.reason}</div>
                          ) : null}
                        </div>
                        <KindPill kind={o.kind} />
                      </div>
                    </li>
                  ))}
                </ul>

                {items.length > 4 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedBeds((prev) => {
                        const next = new Set(prev)
                        if (next.has(bedLabel)) next.delete(bedLabel)
                        else next.add(bedLabel)
                        return next
                      })
                    }
                    className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5"
                  >
                    {isExpanded ? '收合' : '顯示全部'}
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <aside className="min-w-0 rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">STAT 摘要</div>
        <div className="mt-4 grid gap-2 text-sm">
          <SummaryRow label="有 STAT 病患" value={`${patientCount} 位`} highlight />
          <SummaryRow label="STAT 醫囑總數" value={`${orders.length} 筆`} />
          {kindFilter.size > 0 ? (
            <SummaryRow
              label="篩選後顯示"
              value={`${shown.length} 筆 · ${beds.length} 床`}
            />
          ) : null}
        </div>
        <div className="mt-4 border-t border-black/5 pt-4">
          <div className="text-[11px] font-semibold text-slate-500">類型分布</div>
          <div className="mt-2 grid gap-2">
            {KINDS.map((k) => {
              const n = countByKind.get(k) ?? 0
              if (n === 0) return null
              return <SummaryRow key={k} label={k} value={`${n} 筆`} />
            })}
          </div>
        </div>
        {oldestMinutes != null ? (
          <div className="mt-4 rounded-2xl bg-[#fff1f0] p-4 ring-1 ring-[#fecaca]">
            <div className="text-xs font-semibold text-[#b3341f]">時間警示</div>
            <div className="mt-1 text-sm text-[#7f1d1d]">
              最早一筆 STAT 已開立約 {oldestMinutes} 分鐘
            </div>
          </div>
        ) : null}
        <div className="mt-5 min-w-0 overflow-hidden rounded-2xl bg-[#fff7ed] p-4 ring-1 ring-[#f1d7b8]">
          <div className="text-xs font-semibold text-[#9a5b1a]">各病患加權參考分數</div>
          <div className="mt-1 text-[11px] text-[#9a5b1a]">依床號分別計算，供排班/負荷參考</div>
          <ul className="mt-3 grid min-w-0 gap-2">
            {patientStats.map(({ bedLabel, diagnosis, count, weight }) => (
              <li
                key={`${bedLabel}|${diagnosis}`}
                className="flex min-w-0 items-start justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 ring-1 ring-[#f1d7b8]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">{bedLabel}</div>
                  <div className="line-clamp-2 break-words text-[11px] leading-snug text-slate-600">{diagnosis}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{count} 筆 STAT</div>
                </div>
                <span className="shrink-0 pl-1 text-lg font-extrabold leading-none text-[#b45309]">{weight}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={highlight ? 'font-semibold text-slate-900' : 'text-slate-600'}>{label}</span>
      <span className={highlight ? 'text-lg font-bold text-[#b3341f]' : 'font-semibold text-slate-800'}>
        {value}
      </span>
    </div>
  )
}

function KindPill({ kind }: { kind: StatOrderKind }) {
  const map: Record<StatOrderKind, string> = {
    檢查: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
    治療: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f1c4b8]',
    給藥: 'bg-[#e6f0ff] text-[#1e4ea7] ring-1 ring-[#b7cff7]',
    監測: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
    其他: 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10',
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[kind]}`}>
      {kind}
    </span>
  )
}

function KindFilterPill({
  kind,
  active,
  onClick,
}: {
  kind: StatOrderKind
  active: boolean
  onClick: () => void
}) {
  const map: Record<StatOrderKind, { on: string; off: string }> = {
    檢查: {
      on: 'bg-[#9a5b1a] text-white',
      off: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
    },
    治療: {
      on: 'bg-[#b3341f] text-white',
      off: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f1c4b8]',
    },
    給藥: {
      on: 'bg-[#1e4ea7] text-white',
      off: 'bg-[#e6f0ff] text-[#1e4ea7] ring-1 ring-[#b7cff7]',
    },
    監測: {
      on: 'bg-[#1e6c3a] text-white',
      off: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
    },
    其他: {
      on: 'bg-[#334155] text-white',
      off: 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10',
    },
  }
  const cls = active ? map[kind].on : map[kind].off
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-95',
        cls,
      ].join(' ')}
    >
      {kind}
    </button>
  )
}

function statOrderWeight(o: ApiStatOrder) {
  return KIND_WEIGHT[o.kind] ?? 1
}

function buildPatientStats(orders: ApiStatOrder[]) {
  const map = new Map<string, { bedLabel: string; diagnosis: string; count: number; weight: number }>()
  for (const o of orders) {
    const key = `${o.bedLabel}|${o.diagnosis}`
    const cur = map.get(key) ?? { bedLabel: o.bedLabel, diagnosis: o.diagnosis, count: 0, weight: 0 }
    cur.count += 1
    cur.weight += statOrderWeight(o)
    map.set(key, cur)
  }
  return [...map.values()].sort((a, b) => b.weight - a.weight || b.count - a.count)
}

function groupByBed(orders: ApiStatOrder[]) {
  const map = new Map<string, ApiStatOrder[]>()
  for (const o of orders) {
    const key = `${o.bedLabel} — ${o.diagnosis}`
    const list = map.get(key) ?? []
    list.push(o)
    map.set(key, list)
  }
  for (const [, list] of map) {
    list.sort((a, b) => compareOrderedAt(b.orderedAt, a.orderedAt))
  }
  return [...map.entries()]
}

function sortByOrderedAt(orders: ApiStatOrder[]) {
  return [...orders].sort((a, b) => compareOrderedAt(b.orderedAt, a.orderedAt))
}

function compareOrderedAt(a: string, b: string) {
  return parseHHMM(a) - parseHHMM(b)
}

function parseHHMM(s: string) {
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return 0
  return Number(m[1]) * 60 + Number(m[2])
}

function minutesSinceOldest(orders: ApiStatOrder[]) {
  if (orders.length === 0) return null
  const oldest = orders.reduce((min, o) => (compareOrderedAt(o.orderedAt, min.orderedAt) < 0 ? o : min))
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const oldestMins = parseHHMM(oldest.orderedAt)
  const diff = nowMins - oldestMins
  return diff >= 0 ? diff : diff + 24 * 60
}
