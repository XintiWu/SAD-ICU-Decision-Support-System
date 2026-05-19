import { useMemo, useState, useSyncExternalStore } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  deleteHandoverSnapshot,
  formatSnapshotDateTime,
  getHandoverSnapshot,
  listHandoverSnapshots,
  openTasksFromSnapshot,
  subscribeHandoverSnapshots,
  taskLoadPoints,
  type HandoverSnapshot,
} from '../state/handoverSnapshotStore'

export function HandoverSnapshotsPage() {
  const items = useSyncExternalStore(subscribeHandoverSnapshots, listHandoverSnapshots, listHandoverSnapshots)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id') ?? items[0]?.id ?? null
  const selected = useMemo(
    () => (selectedId ? getHandoverSnapshot(selectedId) : null),
    [selectedId, items],
  )

  return (
    <div className="grid gap-4">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8fafc] via-white to-[#eef2ff] ring-1 ring-black/10">
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-800 via-[#1d4ed8] to-[#0ea5e9]" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold tracking-wide text-slate-600">HANDOVER ARCHIVE</div>
              <h1 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">交班快照紀錄</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                查閱已封存的交班紀錄（分床、病患麻煩度、任務狀態）。本頁僅供瀏覽，若要新增快照請至
                <Link to="/leader/allocation" className="mx-1 font-semibold text-slate-900 underline underline-offset-2">
                  指派分床配對
                </Link>
                或
                <Link
                  to="/leader/allocation-result"
                  className="mx-1 font-semibold text-slate-900 underline underline-offset-2"
                >
                  查看分床結果
                </Link>
                儲存。
              </p>
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
            <span className="rounded-full bg-[#fafaf8] px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
              {items.length} 筆
            </span>
          </div>

          {items.length === 0 ? (
            <div className="mt-3 rounded-xl bg-[#fafaf8] p-4 text-sm text-slate-600 ring-1 ring-black/5">
              尚無快照。請至「指派分床配對」或「查看分床結果」完成交班後儲存。
            </div>
          ) : (
            <ul className="mt-2 grid max-h-[70vh] gap-1 overflow-y-auto pr-1">
              {items.map((item) => {
                const active = item.id === selectedId
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ id: item.id })}
                      className={[
                        'w-full rounded-xl px-3 py-2.5 text-left transition',
                        active ? 'bg-black text-white' : 'bg-[#fafaf8] text-slate-800 hover:bg-black/5',
                      ].join(' ')}
                    >
                      <div className="text-xs font-semibold opacity-80">{item.shiftLabel}</div>
                      <div className="mt-0.5 text-sm font-extrabold">{formatSnapshotDateTime(item.createdAt)}</div>
                      <div className={['mt-1 flex flex-wrap gap-1 text-[11px] font-semibold', active ? 'text-white/85' : 'text-slate-600'].join(' ')}>
                        <span>未完成 {item.summary.taskOpen}</span>
                        <span>·</span>
                        <span>急件 {item.summary.taskUrgentOpen}</span>
                        <span>·</span>
                        <span>最高負荷 {item.summary.maxLoad}</span>
                      </div>
                      {item.note ? (
                        <div className={['mt-1 truncate text-[11px]', active ? 'text-white/75' : 'text-slate-500'].join(' ')}>
                          {item.note}
                        </div>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="min-w-0">
          {selected ? <SnapshotDetail snapshot={selected} onDeleted={() => setSearchParams({})} /> : <EmptyDetail />}
        </section>
      </div>
    </div>
  )
}

function EmptyDetail() {
  return (
    <div className="grid h-full min-h-[320px] place-items-center rounded-2xl bg-white p-8 text-center ring-1 ring-black/10">
      <div>
        <div className="text-sm font-semibold text-slate-900">選擇左側快照以查看內容</div>
        <p className="mt-2 text-sm text-slate-600">或先儲存一筆交班快照。</p>
      </div>
    </div>
  )
}

function SnapshotDetail({ snapshot, onDeleted }: { snapshot: HandoverSnapshot; onDeleted: () => void }) {
  const openTasks = useMemo(() => openTasksFromSnapshot(snapshot), [snapshot])
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteHandoverSnapshot(snapshot.id)
    onDeleted()
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-600">{snapshot.shiftLabel}</div>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
              {formatSnapshotDateTime(snapshot.createdAt)}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-[#fafaf8] px-2.5 py-1 font-semibold ring-1 ring-black/10">
                記錄人 {snapshot.createdBy}
              </span>
              {snapshot.note ? (
                <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 font-semibold text-[#9a5b1a] ring-1 ring-[#f1d7b8]">
                  {snapshot.note}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            className={[
              'rounded-xl px-3 py-2 text-xs font-semibold ring-1',
              confirmDelete
                ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]'
                : 'bg-white text-slate-700 ring-black/10 hover:bg-slate-50',
            ].join(' ')}
          >
            {confirmDelete ? '再次點擊確認刪除' : '刪除此快照'}
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="負責護理師" value={`${snapshot.summary.nurseCount}`} hint="有位" />
          <Kpi label="未完成任務" value={`${snapshot.summary.taskOpen}`} hint={`共 ${snapshot.summary.taskTotal} 項`} warn={snapshot.summary.taskOpen > 0} />
          <Kpi label="未完成急件" value={`${snapshot.summary.taskUrgentOpen}`} hint="待處理" warn={snapshot.summary.taskUrgentOpen > 0} />
          <Kpi label="負荷" value={`${snapshot.summary.maxLoad}`} hint={`平均 ${snapshot.summary.avgLoad}`} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <SectionTitle title="分床分配（封存當下）" subtitle={`${snapshot.nurseBlocks.length} 位護理師有分配床位`} />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.nurseBlocks.map((block) => (
            <article key={block.nurseId} className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/10">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">護理師 {block.nurseName}</h3>
                <LoadPill load={block.load} />
              </div>
              <ul className="mt-3 grid gap-2">
                {block.beds.map((bed) => (
                  <li key={bed.patientId} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-black/5">
                    <span className="min-w-0 truncate text-xs font-semibold text-slate-800">{bed.label}</span>
                    <TonePill tone={bed.tone} score={bed.score} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        {snapshot.allocation.unassigned.length > 0 ? (
          <p className="mt-3 text-xs font-semibold text-[#b3341f]">
            封存時有 {snapshot.allocation.unassigned.length} 床未分配
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <SectionTitle title="未完成任務（交班摘要）" subtitle={`${openTasks.length} 項待接手`} />
        {openTasks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">封存當下所有任務均已完成。</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-semibold">床位</th>
                  <th className="px-4 py-2 font-semibold">任務</th>
                  <th className="px-4 py-2 font-semibold">類型</th>
                  <th className="px-4 py-2 font-semibold">負荷分</th>
                </tr>
              </thead>
              <tbody>
                {openTasks.map((t) => (
                  <tr key={t.id} className="border-t border-black/10">
                    <td className="px-4 py-2 font-semibold text-slate-900 whitespace-nowrap">{t.bedLabel}</td>
                    <td className="px-4 py-2 text-slate-800">
                      <span className="font-semibold">{t.title}</span>
                      {t.urgent ? (
                        <span className="ml-2 rounded-full bg-[#ffe8e1] px-2 py-0.5 text-[11px] font-semibold text-[#b3341f]">
                          急
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{t.kind}</td>
                    <td className="px-4 py-2 font-semibold text-slate-800">{taskLoadPoints(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-3 ring-1 ring-black/5">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className={`text-2xl font-extrabold ${warn ? 'text-[#b3341f]' : 'text-slate-900'}`}>{value}</div>
        <span
          className={[
            'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
            warn ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]' : 'bg-white text-slate-700 ring-black/10',
          ].join(' ')}
        >
          {hint}
        </span>
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
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ring-1 ${cls}`}>負荷 {load}</span>
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
