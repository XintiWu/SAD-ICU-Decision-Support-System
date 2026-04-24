export function WarRoomPage() {
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">ICU 戰情室</div>
          <div className="mt-1 text-xs text-slate-600">
            護理師即時工作負荷（完成任務自動消除，剩餘分數與優先順序即時更新）
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10">
            白班 即時
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10">
            小組長視角
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <NurseLoadCard
          name="護理師 王小明"
          remaining={18}
          tone="high"
          tasks={[
            { text: '床 2 給藥 Vancomycin', done: true },
            { text: '床 2 抽血 CBC/Diff', urgent: true },
            { text: '床 7 量血壓 Q1H', urgent: false },
          ]}
        />
        <NurseLoadCard
          name="護理師 陳美麗"
          remaining={6}
          tone="low"
          tasks={[
            { text: '床 3 傷口換藥', done: true },
            { text: '床 3 輸液補充', done: true },
            { text: '床 3 家屬溝通', urgent: false },
          ]}
        />
        <NurseLoadCard
          name="護理師 林志強"
          remaining={11}
          tone="mid"
          tasks={[
            { text: '床 5 心電圖監測', urgent: false },
            { text: '床 5 醫囑確認', urgent: false },
            { text: '床 9 入院評估', newbie: true },
          ]}
        />
      </div>

      <div className="mt-6 rounded-2xl bg-[#fafaf8] p-4 text-xs text-slate-600 ring-1 ring-black/5">
        顏色：紅＝高負荷、橘＝中、綠＝輕鬆；任務勾選後分數即時下降並重排優先級。
      </div>
    </div>
  )
}

function NurseLoadCard({
  name,
  remaining,
  tone,
  tasks,
}: {
  name: string
  remaining: number
  tone: 'high' | 'mid' | 'low'
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

  return (
    <section className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{name}</div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>
          剩餘 {remaining}
        </span>
      </div>

      <ul className="mt-4 grid gap-2">
        {tasks.map((t, idx) => (
          <li key={idx} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
            <div className="min-w-0">
              <div className={`truncate text-sm ${t.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {t.text}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {t.urgent ? (
                  <span className="rounded-full bg-[#ffe8e1] px-2 py-0.5 font-semibold text-[#b3341f]">急</span>
                ) : null}
                {t.newbie ? (
                  <span className="rounded-full bg-[#fff7ed] px-2 py-0.5 font-semibold text-[#9a5b1a]">新人</span>
                ) : null}
                {t.done ? <span className="text-slate-500">完成</span> : <span className="text-slate-500">—</span>}
              </div>
            </div>
            <input type="checkbox" checked={!!t.done} readOnly className="h-4 w-4 accent-black" />
          </li>
        ))}
      </ul>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5">
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </section>
  )
}

