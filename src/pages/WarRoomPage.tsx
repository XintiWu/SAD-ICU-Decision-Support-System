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
    <div className="grid gap-3">
      <section className="rounded-2xl bg-white p-4 ring-1 ring-black/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">ICU 戰情室</div>
              <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 text-[11px] font-semibold text-[#9a5b1a] ring-1 ring-[#f1d7b8]">
                小組長視角
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600">即時掌握每位護理師任務進度與急件狀態</div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-4 py-3 text-white ring-1 ring-black/10">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-extrabold tracking-wide">
                全體概況 <span className="text-white/60">OVERVIEW</span>
              </span>
              <span className="mx-1 hidden h-4 w-px bg-white/10 sm:inline-block" />

              <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold ring-1 ring-white/10">
                護理師 <span className="ml-1 text-sm font-extrabold">{nurses.length}</span>
              </span>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 font-semibold text-emerald-100 ring-1 ring-emerald-400/20">
                完成 <span className="ml-1 text-sm font-extrabold text-white">{doneTasks}</span>
                <span className="text-white/70">/{totalTasks}</span>
              </span>
              <span className="rounded-full bg-rose-500/15 px-3 py-1.5 font-semibold text-rose-100 ring-1 ring-rose-400/20">
                急件 <span className="ml-1 text-sm font-extrabold text-white">{urgentTasks}</span>
              </span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-100 ring-1 ring-amber-400/20">
                負擔
                <span className="ml-2 text-white/80">
                  高 <span className="font-extrabold text-white">{highCount}</span>｜中{' '}
                  <span className="font-extrabold text-white">{midCount}</span>｜低{' '}
                  <span className="font-extrabold text-white">{lowCount}</span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {nurses.map((n) => (
            <NurseLoadCard
              key={n.name}
              name={n.name}
              remaining={n.remaining}
              tone={n.tone}
              assignments={n.assignments}
              tasks={n.tasks}
            />
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

      <div className="mt-3 grid gap-2.5">
        {bedOrder.map((bed) => (
          <section
            key={bed}
            className="overflow-hidden rounded-xl bg-[#fafaf8] ring-1 ring-black/10"
          >
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
                    <div
                      className={`truncate text-xs leading-snug ${t.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                    >
                      {t.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      {t.urgent ? (
                        <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span>
                      ) : null}
                      {t.newbie ? (
                        <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span>
                      ) : null}
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
            <div className="border-b border-black/10 bg-white px-2.5 py-2 text-xs font-extrabold tracking-wide text-slate-900">
              其他
            </div>
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
                    <div
                      className={`truncate text-xs leading-snug ${t.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                    >
                      {t.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      {t.urgent ? (
                        <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span>
                      ) : null}
                      {t.newbie ? (
                        <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span>
                      ) : null}
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
    </section>
  )
}

