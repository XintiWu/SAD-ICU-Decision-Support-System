import type { ReactNode } from 'react'
import { useState } from 'react'

export function ReportsPage() {
  const [view, setView] = useState<'護理師' | '小組長'>('護理師')
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">報表</div>
          <div className="mt-1 text-xs text-slate-600">
            同頁支援護理師/小組長兩種視角：護理師偏交班與個人進度，小組長偏負荷與分配監控
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PillTab active={view === '護理師'} onClick={() => setView('護理師')}>
            護理師視角
          </PillTab>
          <PillTab active={view === '小組長'} onClick={() => setView('小組長')}>
            小組長視角
          </PillTab>
          <button
            type="button"
            className="ml-1 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
          >
            匯出 PDF
          </button>
        </div>
      </div>

      {view === '護理師' ? (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Metric title="我的剩餘負荷" value="18" hint="依本班待辦與麻煩度估算（示意）" tone="high" />
            <Metric title="待完成任務" value="5" hint="含醫囑/常規/交班轉任務（示意）" tone="mid" />
            <Metric title="交班完整度" value="85%" hint="缺 1 床主觀麻煩度（示意）" tone="low" />
          </div>

          <div className="mt-6 rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/5">
            <div className="text-sm font-semibold text-slate-900">交班報表（護理師）</div>
            <div className="mt-1 text-xs text-slate-600">
              強調：每床重點、未完成事項、下班前檢核（示意）
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-800">
              <ReportRow title="床 2 — 敗血症" body="血壓趨勢偏低；升壓藥需追蹤；抽血結果待回報" />
              <ReportRow title="床 7 — COPD 急性惡化" body="SpO₂ 波動；X 光回報待確認；吸入治療反應尚可" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Metric title="本班平均負荷" value="14.2" hint="以麻煩度 + 任務密度估算（示意）" tone="mid" />
            <Metric title="負荷不均指標" value="0.28" hint="越高代表越不平均（示意）" tone="high" />
            <Metric title="逾時/高風險任務" value="2" hint="需支援：檢查回報、用藥確認（示意）" tone="high" />
          </div>

          <div className="mt-6 rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/5">
            <div className="text-sm font-semibold text-slate-900">負荷與分配摘要（小組長）</div>
            <div className="mt-1 text-xs text-slate-600">
              強調：誰最忙、哪床最重、是否需要調整分床（調整仍在分配頁進行）
            </div>
            <div className="mt-4 grid gap-2 text-sm text-slate-800">
              <ReportRow title="護理師 王小明" body="負荷 26（偏高）— 建議支援抽血/監測" />
              <ReportRow title="護理師 陳美麗" body="負荷 14（可承接）— 可考慮轉移 1 床或任務" />
              <ReportRow title="高麻煩度床位" body="床 5（18 分）、床 2（17 分）— 需優先監控" />
            </div>
          </div>
        </>
      )}

    </div>
  )
}

function PillTab({
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

function ReportRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{body}</div>
    </div>
  )
}

function Metric({
  title,
  value,
  hint,
  tone,
}: {
  title: string
  value: string
  hint: string
  tone: 'high' | 'mid' | 'low'
}) {
  const pill =
    tone === 'high'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
      : tone === 'mid'
        ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
        : 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/5">
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>示意</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">{hint}</div>
    </div>
  )
}

