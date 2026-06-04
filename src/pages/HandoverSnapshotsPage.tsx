import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, type HandoffSnapshotDetail, type HandoffSnapshotListItem } from '../api/client'
import { useShift } from '../context/useShift'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatNurseDisplay } from '../lib/nurseLabel'

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

  useEffect(() => {
    let alive = true
    apiGet<HandoffSnapshotDetail>(`/handoff-snapshots/${activeId}`)
      .then((data) => {
        if (!alive) return
        setSelected(data)
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
      <SnapshotDetail
        snapshot={selected}
        snapshotIndex={selectedIndex}
        snapshotTotal={items.length}
        duplicateSnapshotLabels={duplicateSnapshotLabels}
      />
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
        <SectionTitle title="分床分配（封存當下）" subtitle={`${snapshot.nurseBlocks.length} 位護理師有分配床位`} />
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
                  <li
                    key={bed.admissionId}
                    className="flex min-w-0 items-center gap-2 overflow-hidden rounded-xl bg-white px-3 py-2 ring-1 ring-black/5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800" title={bed.label}>
                      {bed.label}
                    </span>
                    <TonePill tone={bed.tone} score={bed.score} />
                  </li>
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
