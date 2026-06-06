import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { apiGet, type HandoffSnapshotDetail, type HandoffSnapshotListItem, type ApiAdmission, type BurdenAssessment, type ApiStatOrder } from '../api/client'
import { useShift } from '../context/useShift'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatNurseDisplay } from '../lib/nurseLabel'
import { buildPatientCatalog, mergeBurdenIntoCatalog, mergeStatIntoCatalog, type CatalogEntry } from '../components/allocation/allocationApiState'
import { AllocationCatalogProvider } from '../components/allocation/allocationCatalog'
import { AllocationPatientHoverHost } from '../components/allocation/AllocationPatientHoverHost'

export function HandoverSnapshotsPage() {
  const { shiftId } = useShift()
  return <HandoverSnapshotsPageBody key={shiftId} shiftId={shiftId} />
}

function HandoverSnapshotsPageBody({ shiftId }: { shiftId: string }) {
  const { selectedShift } = useShift()
  const [items, setItems] = useState<HandoffSnapshotListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    apiGet<HandoffSnapshotListItem[]>(`/handoff-snapshots`)
      .then((data) => {
        if (!alive) return
        setItems(data)
        setSelectedSnapshotId(data[0]?.id ?? null)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        setItems([])
        setSelectedSnapshotId(null)
        setError(err instanceof Error ? err.message : '讀取交班快照失敗')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [shiftId])

  const activeId =
    selectedSnapshotId && items.some((item) => item.id === selectedSnapshotId)
      ? selectedSnapshotId
      : (items[0]?.id ?? null)

  if (error) {
    return (
      <div className="rounded-2xl bg-[#ffe8e1] p-5 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">
        {error}
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8fafc] via-white to-[#eef2ff] ring-1 ring-black/10">
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-800 via-[#1d4ed8] to-[#0ea5e9]" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-slate-600">HANDOVER ARCHIVE</div>
              <h1 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">交班快照紀錄</h1>
              <p className="mt-1 text-sm text-slate-600">
                顯示所有班別已封存的交班快照。若要新增，請至{' '}
                <Link to="/leader/allocation" className="font-semibold text-slate-900 underline underline-offset-2">
                  指派分床配對
                </Link>{' '}
                確認分床。
              </p>
              {selectedShift ? (
                <p className="mt-2 text-xs font-semibold text-slate-500">目前班別：{selectedShift.label}</p>
              ) : null}
            </div>
            <p className="shrink-0 text-sm text-slate-600">
              <span className="font-extrabold text-slate-900">{items.length}</span> 筆快照
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="text-xs font-semibold text-slate-600">歷史快照</div>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
              {items.length} 筆
            </span>
          </div>

          {loading ? (
            <div className="mt-3 rounded-xl bg-surface p-4 text-sm text-slate-600">載入中…</div>
          ) : items.length === 0 ? (
            <div className="mt-3 rounded-xl bg-surface p-4 text-sm text-slate-600 ring-1 ring-black/5">
              {selectedShift ? (
                <>
                  <span className="font-semibold text-slate-800">{selectedShift.label}</span>
                  <span> 尚無交班快照。</span>
                </>
              ) : (
                '此班別尚無交班快照。'
              )}
              <p className="mt-2 text-xs text-slate-500">請切換至已確認分床的班別，或至「指派分床配對」完成確認。</p>
            </div>
          ) : (
            <ul className="mt-2 grid max-h-[70vh] gap-1 overflow-y-auto pr-1">
              {items.map((item, index) => {
                const active = item.id === activeId
                const versionLabel = index === 0 ? '最新' : `#${index + 1}`
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshotId(item.id)}
                      className={[
                        'w-full rounded-xl px-3 py-2.5 text-left transition',
                        active ? 'bg-black text-white ring-2 ring-[#1d4ed8]' : 'bg-surface text-slate-800 hover:bg-black/5',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold opacity-80">{item.shiftLabel}</div>
                        <span
                          className={[
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            active ? 'bg-white/15 text-white' : 'bg-white text-slate-700 ring-1 ring-black/10',
                          ].join(' ')}
                        >
                          {versionLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-extrabold">{formatSnapshotDateTime(item.createdAt)}</div>
                      <div
                        className={[
                          'mt-1 flex flex-wrap gap-1 text-[11px] font-semibold',
                          active ? 'text-white/85' : 'text-slate-600',
                        ].join(' ')}
                      >
                        <span>STAT {item.summary.statTotal}</span>
                        <span>·</span>
                        <span>最高負荷 {item.summary.maxLoad}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="min-w-0">
          {activeId ? (
            <HandoverSnapshotDetailSection key={activeId} activeId={activeId} items={items} />
          ) : (
            <EmptyDetail />
          )}
        </section>
      </div>
    </div>
  )
}

function HandoverSnapshotDetailSection({
  activeId,
  items,
}: {
  activeId: string
  items: HandoffSnapshotListItem[]
}) {
  const [selected, setSelected] = useState<HandoffSnapshotDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [catalog, setCatalog] = useState<Map<string, CatalogEntry>>(new Map())

  useEffect(() => {
    let alive = true
    setDetailLoading(true)

    apiGet<HandoffSnapshotDetail>(`/handoff-snapshots/${activeId}`)
      .then(async (snapshotData) => {
        if (!alive) return

        try {
          const [admissionsData, burdenData, statData] = await Promise.all([
            apiGet<ApiAdmission[]>(`/admissions?shiftId=${snapshotData.shiftId}&status=active`),
            apiGet<BurdenAssessment[]>(`/burden-assessments?shiftId=${snapshotData.shiftId}&scope=all`),
            apiGet<ApiStatOrder[]>(`/stat-orders?shiftId=${snapshotData.shiftId}`).catch(() => [] as ApiStatOrder[]),
          ])

          if (!alive) return
          const nextCatalog = buildPatientCatalog(admissionsData)
          mergeBurdenIntoCatalog(nextCatalog, burdenData)
          mergeStatIntoCatalog(nextCatalog, statData)
          setCatalog(nextCatalog)
        } catch (err) {
          console.error('Failed to load snapshot patient details:', err)
        }

        setSelected(snapshotData)
      })
      .catch(() => {
        if (!alive) return
        setSelected(null)
      })
      .finally(() => {
        if (alive) setDetailLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activeId])

  const selectedIndex = items.findIndex((item) => item.id === activeId)
  const duplicateSnapshotLabels = useMemo(() => {
    if (!selected || items.length < 2) return []
    const signature =
      selected.allocationSignature ?? allocationSignatureFromNurseBlocks(selected.nurseBlocks)
    return items
      .filter((item) => item.id !== activeId && item.allocationSignature === signature)
      .map((item) => formatSnapshotDateTime(item.createdAt))
  }, [activeId, items, selected])

  if (detailLoading) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-2xl bg-white p-8 text-sm text-slate-600 ring-1 ring-black/10">
        讀取快照內容…
      </div>
    )
  }

  if (selected) {
    return (
      <AllocationCatalogProvider catalog={catalog}>
        <SnapshotDetail
          snapshot={selected}
          snapshotIndex={selectedIndex}
          snapshotTotal={items.length}
          duplicateSnapshotLabels={duplicateSnapshotLabels}
        />
      </AllocationCatalogProvider>
    )
  }

  return <EmptyDetail />
}

function formatSnapshotDateTime(iso: string) {
  const date = new Date(iso)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei',
  })
}

function EmptyDetail() {
  return (
    <div className="grid h-full min-h-[320px] place-items-center rounded-2xl bg-white p-8 text-center ring-1 ring-black/10">
      <div>
        <div className="text-sm font-semibold text-slate-900">選擇左側快照以查看內容</div>
        <p className="mt-2 text-sm text-slate-600">或先確認一筆分床。</p>
      </div>
    </div>
  )
}

function SnapshotDetail({
  snapshot,
  snapshotIndex,
  snapshotTotal,
  duplicateSnapshotLabels,
}: {
  snapshot: HandoffSnapshotDetail
  snapshotIndex: number
  snapshotTotal: number
  duplicateSnapshotLabels: string[]
}) {
  const chargeNurseId = useChargeNurseId(snapshot.shiftId)
  const versionNo = snapshotIndex >= 0 ? snapshotIndex + 1 : null
  const [showVisualMap, setShowVisualMap] = useState(false)

  return (
    <div className="grid gap-4">
      {duplicateSnapshotLabels.length > 0 ? (
        <div className="rounded-2xl bg-[#eff6ff] px-4 py-3 text-sm text-[#1e3a8a] ring-1 ring-[#bfdbfe]">
          <span className="font-semibold">分床配置與其他封存相同</span>
          <span className="mt-1 block text-xs leading-relaxed text-[#1e40af]">
            床位分配內容一致，但封存時間不同。相同配置的其它快照：
            {duplicateSnapshotLabels.join('、')}。請以左側<strong className="font-bold">封存時間</strong>
            或<strong className="font-bold">版本標籤</strong>區分紀錄。
          </span>
        </div>
      ) : null}

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-slate-600">{snapshot.shiftLabel}</div>
            {versionNo != null ? (
              <span className="rounded-full bg-[#1d4ed8] px-2.5 py-0.5 text-[10px] font-bold text-white">
                第 {versionNo} / {snapshotTotal} 筆{snapshotIndex === 0 ? ' · 最新' : ''}
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
            封存於 {formatSnapshotDateTime(snapshot.createdAt)}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-surface px-2.5 py-1 font-semibold ring-1 ring-black/10">
              記錄人 {formatNurseDisplay(snapshot.createdBy, { role: 'charge_nurse' })}
            </span>
            <span className="rounded-full bg-surface px-2.5 py-1 font-mono text-[10px] font-semibold text-slate-500 ring-1 ring-black/10">
              快照 {snapshot.id.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="護理師人數" value={`${snapshot.summary.nurseCount}`} />
          <Kpi label="病患人數" value={`${snapshot.summary.patientCount}`} />
          <Kpi
            label="突發性醫囑"
            value={`${snapshot.summary.statTotal}`}
            hint="STAT"
            warn={snapshot.summary.statTotal > 0}
          />
          <Kpi label="平均負荷指標" value={`${snapshot.summary.avgLoad}`} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionTitle title="分床分配（封存當下）" subtitle={`${snapshot.nurseBlocks.length} 位護理師有分配床位`} />
          <button
            type="button"
            onClick={() => setShowVisualMap(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            圖形化床位圖
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.nurseBlocks.map((block) => (
            <article key={block.nurseId} className="min-w-0 overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-black/10">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-extrabold text-slate-900">
                  護理師 {formatNurseDisplay(block.nurseName, { nurseId: block.nurseId, chargeNurseId })}
                </h3>
                <LoadPill load={block.load} />
              </div>
              <ul className="mt-3 grid min-w-0 gap-2">
                {block.beds.map((bed) => (
                  <AllocationPatientHoverHost key={bed.admissionId} patientId={bed.admissionId}>
                    <li
                      className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl bg-white px-3 py-2 ring-1 ring-black/5 cursor-pointer hover:ring-black/15 transition-all duration-150"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800" title={bed.label}>
                        {bed.label}
                      </span>
                      <TonePill tone={bed.tone} score={bed.score} />
                    </li>
                  </AllocationPatientHoverHost>
                ))}
              </ul>
            </article>
          ))}
        </div>
        {snapshot.allocation.unassignedCount > 0 ? (
          <p className="mt-3 text-xs font-semibold text-[#b3341f]">
            封存時有 {snapshot.allocation.unassignedCount} 床未分配
          </p>
        ) : null}
      </div>

      {showVisualMap && (
        <HandoffVisualMapModal
          snapshot={snapshot}
          onClose={() => setShowVisualMap(false)}
        />
      )}
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
    </div>
  )
}

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-3 ring-1 ring-black/5">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className={`text-2xl font-extrabold ${warn ? 'text-[#b3341f]' : 'text-slate-900'}`}>{value}</div>
        {hint ? (
          <span
            className={[
              'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
              warn ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]' : 'bg-white text-slate-700 ring-black/10',
            ].join(' ')}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function LoadPill({ load }: { load: number }) {
  const tone = load >= 20 ? 'high' : load >= 14 ? 'mid' : 'low'
  const cls =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-[#b7e0c5]'
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ring-1 ${cls}`}>負荷 {load}</span>
  )
}

function TonePill({ tone, score }: { tone: 'high' | 'mid' | 'low'; score: number }) {
  const cls =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-[#b7e0c5]'
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold ring-1 ${cls}`}>{score}</span>
}

function allocationSignatureFromNurseBlocks(blocks: HandoffSnapshotDetail['nurseBlocks']) {
  const pairs = blocks.flatMap((block) =>
    block.beds.map((bed) => `${bed.admissionId}:${block.nurseId}`),
  )
  pairs.sort()
  return pairs.join('|')
}

function getBedNumber(label: string): number {
  const match = label.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

const NURSE_THEMES = [
  { bg: 'bg-[#eff6ff]', border: 'border-[#bfdbfe]', text: 'text-[#1e40af]', pill: 'bg-[#bfdbfe] text-[#1e40af]' }, // Blue
  { bg: 'bg-[#f0fdf4]', border: 'border-[#bbf7d0]', text: 'text-[#166534]', pill: 'bg-[#bbf7d0] text-[#166534]' }, // Green
  { bg: 'bg-[#fff7ed]', border: 'border-[#ffedd5]', text: 'text-[#9a3412]', pill: 'bg-[#ffedd5] text-[#9a3412]' }, // Orange
  { bg: 'bg-[#faf5ff]', border: 'border-[#e9d5ff]', text: 'text-[#6b21a8]', pill: 'bg-[#e9d5ff] text-[#6b21a8]' }, // Purple
  { bg: 'bg-[#fdf2f8]', border: 'border-[#fbcfe8]', text: 'text-[#9d174d]', pill: 'bg-[#fbcfe8] text-[#9d174d]' }, // Pink
  { bg: 'bg-[#ecfeff]', border: 'border-[#c5f6fa]', text: 'text-[#083344]', pill: 'bg-[#c5f6fa] text-[#083344]' }, // Cyan
  { bg: 'bg-[#fff1f2]', border: 'border-[#fecdd3]', text: 'text-[#9f1239]', pill: 'bg-[#fecdd3] text-[#9f1239]' }, // Rose
  { bg: 'bg-[#f0fdfa]', border: 'border-[#ccfbf1]', text: 'text-[#115e59]', pill: 'bg-[#ccfbf1] text-[#115e59]' }, // Teal
  { bg: 'bg-[#fefce8]', border: 'border-[#fef08a]', text: 'text-[#854d0e]', pill: 'bg-[#fef08a] text-[#854d0e]' }, // Yellow
  { bg: 'bg-[#f5f5f4]', border: 'border-[#e7e5e4]', text: 'text-[#44403c]', pill: 'bg-[#e7e5e4] text-[#44403c]' }, // Stone
]

function HandoffVisualMapModal({
  snapshot,
  onClose,
}: {
  snapshot: HandoffSnapshotDetail
  onClose: () => void
}) {
  const chargeNurseId = useChargeNurseId(snapshot.shiftId)
  const [hoveredNurseId, setHoveredNurseId] = useState<string | null>(null)

  const nurseThemeMap = useMemo(() => {
    const map = new Map<string, typeof NURSE_THEMES[number]>()
    snapshot.nurseBlocks.forEach((block, idx) => {
      map.set(block.nurseId, NURSE_THEMES[idx % NURSE_THEMES.length])
    })
    return map
  }, [snapshot.nurseBlocks])

  const bedMap = useMemo(() => {
    const map = new Map<
      number,
      HandoffSnapshotDetail['nurseBlocks'][number]['beds'][number] & {
        nurseName: string
        nurseId: string
      }
    >()
    snapshot.nurseBlocks.forEach((block) => {
      block.beds.forEach((bed) => {
        const num = getBedNumber(bed.bedLabel)
        if (num > 0) {
          map.set(num, {
            ...bed,
            nurseName: block.nurseName,
            nurseId: block.nurseId,
          })
        }
      })
    })
    return map
  }, [snapshot.nurseBlocks])

  const isAnyNurseHovered = hoveredNurseId !== null

  const renderBedCell = (bedNum: number) => {
    const bedNumStr = String(bedNum).padStart(2, '0')
    const assigned = bedMap.get(bedNum)
    const isTarget = assigned && assigned.nurseId === hoveredNurseId
    const highlightCls = isAnyNurseHovered
      ? isTarget
        ? 'ring-4 ring-blue-600 ring-offset-2 scale-[1.04] z-10 shadow-lg'
        : 'opacity-30 blur-[0.3px] scale-[0.97] transition-all duration-200'
      : ''

    if (!assigned) {
      const dimCls = isAnyNurseHovered ? 'opacity-30 blur-[0.3px] scale-[0.97] transition-all duration-200' : ''
      return (
        <div className={`flex flex-col justify-between p-3 h-full min-h-[110px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 text-slate-400 select-none transition-all duration-200 ${dimCls}`}>
          <div className="flex justify-between items-start">
            <span className="bg-slate-300 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">
              {bedNumStr}
            </span>
            <span className="text-[10px] font-bold bg-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded-full">空床</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400/80 text-center py-2">無病人</div>
          <div className="h-4" />
        </div>
      )
    }

    const theme = nurseThemeMap.get(assigned.nurseId) || NURSE_THEMES[0]
    const parts = assigned.label.split(' — ')
    const diagnosis = parts[1] || '無診斷'

    const toneCls =
      assigned.tone === 'high'
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : assigned.tone === 'mid'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200'

    return (
      <AllocationPatientHoverHost patientId={assigned.admissionId}>
        <div className={`flex flex-col justify-between p-3 h-full min-h-[110px] rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer ${highlightCls}`}>
          <div className="flex justify-between items-start gap-1">
            <span className="bg-slate-900 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0">
              {bedNumStr}
            </span>
            <span className="text-[11px] font-bold text-slate-900 truncate flex-1 text-right" title={diagnosis}>
              {diagnosis}
            </span>
          </div>

          <div className="my-1.5 flex flex-col gap-1 items-stretch">
            <div className="flex justify-between items-center gap-1.5">
              <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold truncate max-w-[90px] ${theme.pill}`}>
                {formatNurseDisplay(assigned.nurseName, { nurseId: assigned.nurseId, chargeNurseId })}
              </span>
              <span className={`text-[10px] font-extrabold px-1.5 py-px rounded-full border shrink-0 ${toneCls}`}>
                {assigned.score}分
              </span>
            </div>
          </div>
        </div>
      </AllocationPatientHoverHost>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="visual-map-title">
      <button type="button" className="absolute inset-0 bg-transparent cursor-default" onClick={onClose} aria-label="關閉" />
      <div className="relative z-10 w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="border-b border-black/10 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="visual-map-title" className="text-lg font-black tracking-tight text-slate-900">
                ICU 實體病房分床配置圖
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                班別：{snapshot.shiftLabel} · 封存時間：{formatSnapshotDateTime(snapshot.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
              aria-label="關閉"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 items-center">
          {/* Nurse Legend */}
          <div className="w-full max-w-5xl bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
            <span className="text-[11px] font-black tracking-wider text-slate-400">護理師色標及負荷指標：</span>
            <div className="flex flex-wrap gap-2">
              {snapshot.nurseBlocks.map((block) => {
                const theme = nurseThemeMap.get(block.nurseId) || NURSE_THEMES[0]
                const isHovered = hoveredNurseId === block.nurseId
                return (
                  <div
                    key={block.nurseId}
                    onMouseEnter={() => setHoveredNurseId(block.nurseId)}
                    onMouseLeave={() => setHoveredNurseId(null)}
                    className={`flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-xl shadow-sm ring-1 ring-black/5 transition-all duration-200 cursor-pointer select-none ${
                      isHovered ? 'ring-slate-950 bg-slate-100 scale-105 shadow-md' : 'hover:scale-103'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${theme.pill.split(' ')[0]}`} />
                    <span>護理師 {formatNurseDisplay(block.nurseName, { nurseId: block.nurseId, chargeNurseId })}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md font-bold">負荷: {block.load}分</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grid Layout Container */}
          <div className="grid grid-cols-7 grid-rows-4 gap-3.5 w-full max-w-5xl border border-slate-200 p-5 rounded-3xl bg-white shadow-md relative">
            {/* Row 1 */}
            <div className="row-start-1 col-start-1">{renderBedCell(9)}</div>
            <div className="row-start-1 col-start-2">{renderBedCell(10)}</div>
            <div className="row-start-1 col-start-3">{renderBedCell(11)}</div>
            <div className="row-start-1 col-start-4">{renderBedCell(12)}</div>
            <div className="row-start-1 col-start-5">{renderBedCell(13)}</div>
            <div className="row-start-1 col-start-6">{renderBedCell(14)}</div>
            <div className="row-start-1 col-start-7">{renderBedCell(15)}</div>

            {/* Row 2 */}
            <div className="row-start-2 col-start-1">{renderBedCell(8)}</div>
            {/* Nursing Station spanning cols 2 to 6, rows 2 to 3 */}
            <div className="row-start-2 col-start-2 col-span-5 row-span-2 bg-slate-900 text-white rounded-3xl flex flex-col items-center justify-center font-black text-base shadow-xl border border-slate-800 p-4 select-none">
              <div className="flex items-center gap-2">
                <svg className="h-6 w-6 text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="tracking-widest">護理站</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-normal mt-1">NURSING STATION</span>
            </div>
            <div className="row-start-2 col-start-7">{renderBedCell(16)}</div>

            {/* Row 3 */}
            <div className="row-start-3 col-start-1">{renderBedCell(7)}</div>
            <div className="row-start-3 col-start-7">{renderBedCell(17)}</div>

            {/* Row 4 */}
            <div className="row-start-4 col-start-1">{renderBedCell(6)}</div>
            <div className="row-start-4 col-start-2">{renderBedCell(5)}</div>
            <div className="row-start-4 col-start-3">{renderBedCell(4)}</div>
            <div className="row-start-4 col-start-4">{renderBedCell(3)}</div>
            <div className="row-start-4 col-start-5">{renderBedCell(2)}</div>
            <div className="row-start-4 col-start-6">{renderBedCell(1)}</div>
            {/* Exit Corridor */}
            <div className="row-start-4 col-start-7 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex flex-col items-center justify-center p-2 text-emerald-800 font-extrabold text-xs shadow-sm select-none">
              <svg className="h-6 w-6 text-emerald-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="mt-1 tracking-wider">往出口</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-black/10 bg-slate-50 px-6 py-4 flex justify-between items-center text-xs text-slate-500">
          <span>* 顏色表示不同的負責護理師，數字標記為病患的照顧負擔分數。</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
