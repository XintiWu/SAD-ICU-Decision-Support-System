import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { getDemoTasks, setDemoTasks, taskPoints, type Task, type TaskKind } from '../state/demoStore'

export function NurseTodoPage() {
  const [filter, setFilter] = useState<'全部' | '待完成' | '已完成'>('全部')
  const [kindFilter, setKindFilter] = useState<Set<TaskKind>>(new Set())
  const [tasks, setTasks] = useState<Task[]>(() => getDemoTasks())

  const counts = useMemo(() => {
    const done = tasks.filter((t) => t.done).length
    const pending = tasks.length - done
    return { done, pending, total: tasks.length }
  }, [tasks])

  const shown = useMemo(() => {
    if (filter === '待完成') return tasks.filter((t) => !t.done)
    if (filter === '已完成') return tasks.filter((t) => t.done)
    return tasks
  }, [filter, tasks])

  const shownByKind = useMemo(() => {
    if (kindFilter.size === 0) return shown
    return shown.filter((t) => kindFilter.has(t.kind))
  }, [kindFilter, shown])

  const remainingPoints = useMemo(
    () => tasks.filter((t) => !t.done).reduce((acc, t) => acc + taskPoints(t), 0),
    [tasks],
  )

  const progress = useMemo(() => {
    const kinds: TaskKind[] = ['給藥', '檢查', '監測', '家屬', '紀錄']
    const byKind = new Map<TaskKind, { done: number; total: number }>()
    for (const k of kinds) byKind.set(k, { done: 0, total: 0 })
    for (const t of tasks) {
      const x = byKind.get(t.kind) ?? { done: 0, total: 0 }
      x.total += 1
      if (t.done) x.done += 1
      byKind.set(t.kind, x)
    }
    return byKind
  }, [tasks])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">我的待辦清單</div>
            <div className="mt-1 text-xs text-slate-600">
              依優先級排序；完成後打勾，負荷分數即時更新
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TabButton active={filter === '全部'} onClick={() => setFilter('全部')}>
              全部（{counts.total}）
            </TabButton>
            <TabButton active={filter === '待完成'} onClick={() => setFilter('待完成')}>
              待完成（{counts.pending}）
            </TabButton>
            <TabButton active={filter === '已完成'} onClick={() => setFilter('已完成')}>
              已完成（{counts.done}）
            </TabButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">標籤篩選</span>
          {(['給藥', '檢查', '監測', '家屬', '紀錄'] as TaskKind[]).map((k) => (
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
          {kindFilter.size > 0 ? (
            <button
              type="button"
              onClick={() => setKindFilter(new Set())}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5"
            >
              清除
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4">
          {groupByBed(shownByKind).map(([bedLabel, items]) => (
            <div key={bedLabel} className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
              <div className="text-xs font-semibold text-slate-800">{bedLabel}</div>
              <ul className="mt-3 grid gap-2">
                {items.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
                    <input
                      type="checkbox"
                      checked={!!t.done}
                      onChange={() =>
                        setTasks((prev) => {
                          const next = prev.map((x) =>
                            x.id === t.id
                              ? { ...x, done: !x.done, at: !x.done ? nowHHMM() : x.at }
                              : x,
                          )
                          setDemoTasks(next)
                          return next
                        })
                      }
                      className="h-4 w-4 accent-black"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm ${t.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {t.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <KindPill kind={t.kind} />
                        {t.urgent ? <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span> : null}
                        {t.at ? <span>完成 {t.at}</span> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5"
                    >
                      詳情
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">進度</div>
        <div className="mt-4 grid gap-3 text-sm">
          {(['給藥', '檢查', '監測', '家屬', '紀錄'] as TaskKind[]).map((k) => {
            const x = progress.get(k) ?? { done: 0, total: 0 }
            return <ProgressRow key={k} label={k} done={x.done} total={x.total} />
          })}
        </div>
        <div className="mt-5 rounded-2xl bg-[#fff7ed] p-4 ring-1 ring-[#f1d7b8]">
          <div className="text-xs font-semibold text-[#9a5b1a]">剩餘負荷分數</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-[#b45309]">{remainingPoints}</div>
          <div className="mt-2 text-xs text-[#9a5b1a]">打勾後即時下降（依任務權重估算）</div>
        </div>
      </aside>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full px-3 py-1.5 text-xs font-semibold transition',
        active ? 'bg-black text-white' : 'bg-white text-slate-700 ring-1 ring-black/10 hover:bg-black/5',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function KindPill({ kind }: { kind: TaskKind }) {
  const map: Record<TaskKind, string> = {
    給藥: 'bg-[#e6f0ff] text-[#1e4ea7] ring-1 ring-[#b7cff7]',
    檢查: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
    監測: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
    家屬: 'bg-[#f3e8ff] text-[#6b21a8] ring-1 ring-[#e0c8ff]',
    紀錄: 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[kind]}`}>{kind}</span>
}

function KindFilterPill({
  kind,
  active,
  onClick,
}: {
  kind: TaskKind
  active: boolean
  onClick: () => void
}) {
  const map: Record<TaskKind, { on: string; off: string }> = {
    給藥: {
      on: 'bg-[#1e4ea7] text-white',
      off: 'bg-[#e6f0ff] text-[#1e4ea7] ring-1 ring-[#b7cff7]',
    },
    檢查: {
      on: 'bg-[#9a5b1a] text-white',
      off: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
    },
    監測: {
      on: 'bg-[#1e6c3a] text-white',
      off: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
    },
    家屬: {
      on: 'bg-[#6b21a8] text-white',
      off: 'bg-[#f3e8ff] text-[#6b21a8] ring-1 ring-[#e0c8ff]',
    },
    紀錄: {
      on: 'bg-[#334155] text-white',
      off: 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10',
    },
  }
  const cls = active ? map[kind].on : map[kind].off
  return (
    <button
      type="button"
      onClick={onClick}
      className={['rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-95', cls].join(' ')}
    >
      {kind}
    </button>
  )
}

function ProgressRow({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, total)) * 100))
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span className="font-semibold text-slate-800">{label}</span>
        <span>
          {done}/{total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/5">
        <div className="h-full bg-[#c64a2c]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function groupByBed(tasks: Task[]) {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    const list = map.get(t.bedLabel) ?? []
    list.push(t)
    map.set(t.bedLabel, list)
  }
  return [...map.entries()]
}

function nowHHMM() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

