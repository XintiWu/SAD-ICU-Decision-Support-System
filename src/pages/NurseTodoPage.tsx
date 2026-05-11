import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { CURRENT_SHIFT_ID, apiGet, apiPatch, type ApiTask } from '../api/client'

type TaskKind = ApiTask['kind']
type Filter = '全部' | '待完成' | '已完成'

export function NurseTodoPage() {
  const [filter, setFilter] = useState<Filter>('全部')
  const [kindFilter, setKindFilter] = useState<Set<TaskKind>>(new Set())
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [expandedBeds, setExpandedBeds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('讀取中...')

  const refresh = useCallback(() => {
    apiGet<ApiTask[]>(`/tasks?shiftId=${CURRENT_SHIFT_ID}&assignee=me`)
      .then((data) => {
        setTasks(data)
        setMessage('')
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : '讀取失敗'))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function toggleTask(task: ApiTask) {
    const nextStatus = task.done ? 'pending' : 'done'
    setTasks((prev) => prev.map((item) => item.id === task.id ? { ...item, done: !item.done, status: nextStatus } : item))
    try {
      const updated = await apiPatch<ApiTask>(`/tasks/${task.id}`, { status: nextStatus })
      setTasks((prev) => prev.map((item) => item.id === task.id ? updated : item))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新失敗')
      refresh()
    }
  }

  const counts = useMemo(() => {
    const done = tasks.filter((t) => t.done).length
    return { done, pending: tasks.length - done, total: tasks.length }
  }, [tasks])

  const shown = useMemo(() => {
    const byStatus = filter === '待完成' ? tasks.filter((t) => !t.done) : filter === '已完成' ? tasks.filter((t) => t.done) : tasks
    return kindFilter.size ? byStatus.filter((t) => kindFilter.has(t.kind)) : byStatus
  }, [filter, kindFilter, tasks])

  const beds = useMemo(() => groupByBed(shown), [shown])
  const remainingPoints = tasks.filter((t) => !t.done).reduce((sum, task) => sum + task.points, 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">我的待辦清單</div>
            <div className="mt-1 text-xs text-slate-600">{message || '完成後會同步更新後端資料庫'}</div>
          </div>
          <div className="flex items-center gap-2">
            {(['全部', '待完成', '已完成'] as Filter[]).map((item) => (
              <TabButton key={item} active={filter === item} onClick={() => setFilter(item)}>
                {item}（{item === '全部' ? counts.total : item === '待完成' ? counts.pending : counts.done}）
              </TabButton>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">標籤篩選</span>
          <div className="ml-auto flex flex-1 flex-wrap justify-end gap-2">
            {(['給藥', '檢查', '監測', '家屬', '紀錄'] as TaskKind[]).map((kind) => (
              <KindFilterPill
                key={kind}
                kind={kind}
                active={kindFilter.has(kind)}
                onClick={() =>
                  setKindFilter((prev) => {
                    const next = new Set(prev)
                    if (next.has(kind)) next.delete(kind)
                    else next.add(kind)
                    return next
                  })
                }
              />
            ))}
            {kindFilter.size > 0 ? (
              <button type="button" onClick={() => setKindFilter(new Set())} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5">清除</button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {beds.map(([bedLabel, items]) => {
            const isExpanded = expandedBeds.has(bedLabel)
            const visibleItems = isExpanded ? items : items.slice(0, 4)
            return (
              <div key={bedLabel} className="rounded-2xl bg-[#fafaf8] p-3 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-800">{bedLabel}</div>
                  {items.length > 4 ? <SmallButton onClick={() => toggleExpanded(bedLabel, setExpandedBeds)}>{isExpanded ? '收合' : `+${items.length - 4} 更多`}</SmallButton> : null}
                </div>
                <ul className="mt-2 grid gap-1.5">
                  {visibleItems.map((task) => (
                    <li key={task.id} className="flex items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-black/5">
                      <input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} className="h-4 w-4 accent-black" />
                      <div className={`min-w-0 flex-1 truncate text-sm ${task.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</div>
                      <KindPill kind={task.kind} />
                      {task.urgent ? <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 text-xs font-semibold text-[#b3341f]">急</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <aside className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">進度</div>
        <div className="mt-5 rounded-2xl bg-[#fff7ed] p-4 ring-1 ring-[#f1d7b8]">
          <div className="text-xs font-semibold text-[#9a5b1a]">剩餘負荷分數</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight text-[#b45309]">{remainingPoints}</div>
          <div className="mt-2 text-xs text-[#9a5b1a]">打勾後同步寫入後端</div>
        </div>
      </aside>
    </div>
  )
}

function toggleExpanded(label: string, setExpandedBeds: Dispatch<SetStateAction<Set<string>>>) {
  setExpandedBeds((prev) => {
    const next = new Set(prev)
    if (next.has(label)) next.delete(label)
    else next.add(label)
    return next
  })
}

function groupByBed(tasks: ApiTask[]) {
  const map = new Map<string, ApiTask[]>()
  for (const task of tasks) map.set(task.bedLabel, [...(map.get(task.bedLabel) ?? []), task])
  return [...map.entries()]
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${active ? 'bg-black text-white' : 'bg-white text-slate-700 ring-1 ring-black/10 hover:bg-black/5'}`}>{children}</button>
}

function SmallButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10 hover:bg-black/5">{children}</button>
}

function KindPill({ kind }: { kind: TaskKind }) {
  return <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">{kind}</span>
}

function KindFilterPill({ kind, active, onClick }: { kind: TaskKind; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-black text-white' : 'bg-white text-slate-700 ring-1 ring-black/10 hover:bg-black/5'}`}>{kind}</button>
}
