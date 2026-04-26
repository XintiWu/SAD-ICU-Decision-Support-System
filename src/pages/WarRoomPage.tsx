import { useMemo, useState } from 'react'

export function WarRoomPage() {
  const nurses: NurseCardModel[] = [
    {
      name: '護理師 王小明',
      remaining: 18,
      tone: 'high',
      assignments: [
        { bed: '2', patient: '張○○' },
        { bed: '7', patient: '李○○' },
      ],
      tasks: [
        { text: '床 2 給藥 Vancomycin', done: true },
        { text: '床 2 抽血 CBC/Diff', urgent: true },
        { text: '床 7 量血壓 Q1H' },
        { text: '床 7 I/O 紀錄回填', done: true },
      ],
    },
    {
      name: '護理師 陳美麗',
      remaining: 6,
      tone: 'low',
      assignments: [{ bed: '3', patient: '陳○○' }],
      tasks: [
        { text: '床 3 傷口換藥', done: true },
        { text: '床 3 輸液補充', done: true },
        { text: '床 3 家屬溝通' },
      ],
    },
    {
      name: '護理師 林志強',
      remaining: 11,
      tone: 'mid',
      assignments: [
        { bed: '5', patient: '黃○○' },
        { bed: '9', patient: '吳○○' },
      ],
      tasks: [
        { text: '床 5 心電圖監測' },
        { text: '床 5 醫囑確認' },
        { text: '床 9 入院評估', newbie: true },
        { text: '床 9 路徑衛教', done: true },
      ],
    },
    {
      name: '護理師 趙怡君',
      remaining: 9,
      tone: 'mid',
      assignments: [{ bed: '1', patient: '周○○' }],
      tasks: [
        { text: '床 1 抽痰 PRN', done: true },
        { text: '床 1 翻身拍背 Q2H' },
        { text: '床 1 醫囑回覆', done: true },
      ],
    },
    {
      name: '護理師 張怡婷',
      remaining: 4,
      tone: 'low',
      assignments: [{ bed: '4', patient: '林○○' }],
      tasks: [
        { text: '床 4 口腔護理', done: true },
        { text: '床 4 CVC 照護', done: true },
        { text: '床 4 交班重點整理', done: true },
      ],
    },
    {
      name: '護理師 蔡宗翰',
      remaining: 16,
      tone: 'high',
      assignments: [
        { bed: '6', patient: '許○○' },
        { bed: '8', patient: '王○○' },
      ],
      tasks: [
        { text: '床 6 監測疼痛評估', urgent: true },
        { text: '床 6 血糖監測 Q4H' },
        { text: '床 8 輸血前確認', urgent: true },
        { text: '床 8 輸血反應監測', urgent: true },
      ],
    },
    {
      name: '護理師 何佳蓉',
      remaining: 7,
      tone: 'low',
      assignments: [{ bed: '10', patient: '鄭○○' }],
      tasks: [
        { text: '床 10 生命徵象記錄', done: true },
        { text: '床 10 飲食評估' },
        { text: '床 10 器材盤點', done: true },
      ],
    },
    {
      name: '護理師 吳承恩',
      remaining: 13,
      tone: 'mid',
      assignments: [
        { bed: '11', patient: '郭○○' },
        { bed: '12', patient: '謝○○' },
      ],
      tasks: [
        { text: '床 11 抗生素給藥' },
        { text: '床 11 血培養送檢', urgent: true },
        { text: '床 12 氣切照護', done: true },
      ],
    },
    {
      name: '護理師 江佩珊',
      remaining: 10,
      tone: 'mid',
      assignments: [{ bed: '13', patient: '葉○○' }],
      tasks: [
        { text: '床 13 術後觀察', urgent: true },
        { text: '床 13 傷口評估', done: true },
        { text: '床 13 疼痛評估' },
      ],
    },
  ]

  const totalTasks = nurses.reduce((acc, n) => acc + n.tasks.length, 0)
  const doneTasks = nurses.reduce((acc, n) => acc + n.tasks.filter((t) => !!t.done).length, 0)
  const urgentTasks = nurses.reduce((acc, n) => acc + n.tasks.filter((t) => !!t.urgent && !t.done).length, 0)
  const highCount = nurses.filter((n) => n.tone === 'high').length
  const midCount = nurses.filter((n) => n.tone === 'mid').length
  const lowCount = nurses.filter((n) => n.tone === 'low').length

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#eef2ff] via-[#f5fbff] to-[#ecfeff] ring-1 ring-black/10 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_0_0_1px_rgba(2,6,23,0.04)_inset]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1d4ed8] via-[#0ea5e9] to-[#14b8a6]" />
        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide text-slate-600">全體概況 OVERVIEW</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">重點指標（完成 / 急件 / 負擔）</div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-800 ring-1 ring-black/10">
                護理師 <span className="ml-1 text-sm font-extrabold text-slate-900">{nurses.length}</span>
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-800 ring-1 ring-black/10">
                總任務 <span className="ml-1 text-sm font-extrabold text-slate-900">{totalTasks}</span>
              </span>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewKpi label="已完成" value={`${doneTasks}`} hint={`${Math.round((doneTasks / Math.max(1, totalTasks)) * 100)}%`} tone="ok" />
            <OverviewKpi label="未完成" value={`${Math.max(0, totalTasks - doneTasks)}`} hint="待處理" tone="mid" />
            <OverviewKpi label="急件" value={`${urgentTasks}`} hint="未完成急件" tone={urgentTasks ? 'danger' : 'ok'} />
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
            <NurseLoadCard key={n.name} name={n.name} remaining={n.remaining} tone={n.tone} assignments={n.assignments} tasks={n.tasks} />
          ))}
        </div>
      </section>
    </div>
  )
}

type NurseCardModel = {
  name: string
  remaining: number
  tone: 'high' | 'mid' | 'low'
  assignments: { bed: string; patient: string }[]
  tasks: { text: string; urgent?: boolean; done?: boolean; newbie?: boolean }[]
}

function taskBed(text: string) {
  const m = text.match(/^床\s*(\d+)\s*(.*)$/)
  if (!m) return null
  return { bed: m[1], title: m[2].trim() }
}

function NurseLoadCard({
  name,
  remaining,
  tone,
  assignments,
  tasks,
}: {
  name: string
  remaining: number
  tone: 'high' | 'mid' | 'low'
  assignments: { bed: string; patient: string }[]
  tasks: { text: string; urgent?: boolean; done?: boolean; newbie?: boolean }[]
}) {
  const [expanded, setExpanded] = useState(false)
  const bar =
    tone === 'high' ? 'bg-[#c64a2c]' : tone === 'mid' ? 'bg-[#d88b2c]' : 'bg-[#2f7a44]'
  const pill =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'

  const pct = Math.min(100, Math.round((remaining / 25) * 100))
  const doneCount = tasks.filter((t) => !!t.done).length
  const totalCount = tasks.length
  const urgentOpen = tasks.filter((t) => !!t.urgent && !t.done).length
  const burdenLabel = tone === 'high' ? '高' : tone === 'mid' ? '中' : '低'

  const openTasks = useMemo(() => tasks.filter((t) => !t.done), [tasks])
  const preview = openTasks
    .slice()
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent))
    .slice(0, 3)

  const tasksByBed = tasks.reduce<Record<string, { title: string; urgent?: boolean; done?: boolean; newbie?: boolean }[]>>(
    (acc, t) => {
      const parsed = taskBed(t.text)
      const bedKey = parsed?.bed ?? '—'
      const title = parsed?.title?.length ? parsed.title : t.text
      if (!acc[bedKey]) acc[bedKey] = []
      acc[bedKey].push({ title, urgent: t.urgent, done: t.done, newbie: t.newbie })
      return acc
    },
    {},
  )

  const bedOrder = [...new Set([...assignments.map((a) => a.bed), ...Object.keys(tasksByBed).filter((k) => k !== '—')])].sort(
    (a, b) => Number(a) - Number(b),
  )

  const bedPatient = new Map(assignments.map((a) => [a.bed, a.patient]))

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
              完成 {doneCount}/{totalCount}
            </span>
            {urgentOpen ? (
              <span className="rounded-full bg-[#ffe8e1] px-2.5 py-0.5 font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]">
                急件 {urgentOpen}
              </span>
            ) : null}
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${pill}`}>負擔 {burdenLabel}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] font-semibold text-slate-500">剩餘</div>
          <div className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">{remaining}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fafaf8] px-3 py-2 ring-1 ring-black/10">
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
              preview.map((t, idx) => (
                <div
                  key={`preview-${idx}`}
                  className={[
                    'flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2',
                    'ring-1 ring-black/10',
                    t.urgent ? 'shadow-[0_0_0_2px_rgba(179,52,31,0.14)]' : '',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-slate-900">{t.text}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      {t.urgent ? <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span> : null}
                      {t.newbie ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span> : null}
                      <span className="text-slate-500">未完成</span>
                    </div>
                  </div>
                  {idx === 0 && openTasks.length > preview.length ? (
                    <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
                      還有 {openTasks.length - preview.length} 筆
                    </span>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-[#fafaf8] px-3 py-2 text-xs text-slate-600 ring-1 ring-black/10">目前沒有未完成任務</div>
            )}
          </div>
        ) : (
          <div className="grid gap-2.5">
            {bedOrder.map((bed) => (
              <section key={bed} className="overflow-hidden rounded-xl bg-[#fafaf8] ring-1 ring-black/10">
                <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-2.5 py-2">
                  <div className="min-w-0 text-xs font-extrabold tracking-wide text-slate-900">
                    床 {bed}
                    <span className="ml-2 font-semibold text-slate-600">{bedPatient.get(bed) ?? ''}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
                    {tasksByBed[bed]?.filter((t) => !!t.done).length ?? 0}/{tasksByBed[bed]?.length ?? 0}
                  </span>
                </div>
                <ul className="grid max-h-44 gap-1.5 overflow-y-auto p-2 pr-1">
                  {(tasksByBed[bed] ?? []).map((t, idx) => (
                    <li
                      key={`${bed}-${idx}`}
                      className={[
                        'flex items-start justify-between gap-3 rounded-xl bg-white px-2.5 py-2',
                        'ring-1 ring-black/10',
                        t.urgent && !t.done ? 'shadow-[0_0_0_2px_rgba(179,52,31,0.18)]' : '',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className={`truncate text-xs leading-snug ${t.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {t.title}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          {t.urgent ? <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span> : null}
                          {t.newbie ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span> : null}
                          {t.done ? <span className="text-slate-500">完成</span> : <span className="text-slate-500">—</span>}
                        </div>
                      </div>
                      <input type="checkbox" checked={!!t.done} readOnly className="mt-0.5 h-4 w-4 accent-black" />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {tasksByBed['—']?.length ? (
              <section className="overflow-hidden rounded-xl bg-[#fafaf8] ring-1 ring-black/10">
                <div className="border-b border-black/10 bg-white px-2.5 py-2 text-xs font-extrabold tracking-wide text-slate-900">其他</div>
                <ul className="grid max-h-44 gap-1.5 overflow-y-auto p-2 pr-1">
                  {tasksByBed['—'].map((t, idx) => (
                    <li
                      key={`other-${idx}`}
                      className={[
                        'flex items-start justify-between gap-3 rounded-xl bg-white px-2.5 py-2',
                        'ring-1 ring-black/10',
                        t.urgent && !t.done ? 'shadow-[0_0_0_2px_rgba(179,52,31,0.18)]' : '',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className={`truncate text-xs leading-snug ${t.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {t.title}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                          {t.urgent ? <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span> : null}
                          {t.newbie ? <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span> : null}
                          {t.done ? <span className="text-slate-500">完成</span> : <span className="text-slate-500">—</span>}
                        </div>
                      </div>
                      <input type="checkbox" checked={!!t.done} readOnly className="mt-0.5 h-4 w-4 accent-black" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </section>
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

