import { Link } from 'react-router-dom'
import { getDemoPatients, getHandoverItems, getLastHandoverAt, getLastHandoverBy } from '../state/demoStore'
import { useMemo, useState } from 'react'

export function HandoverPage() {
  const patients = getDemoPatients()
  const handover = getHandoverItems()
  const handoverAt = getLastHandoverAt()
  const handoverBy = getLastHandoverBy()

  const [draftByBed, setDraftByBed] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const p of patients) {
      init[p.bedLabel] = handover.find((x) => x.bedLabel === p.bedLabel)?.summary ?? ''
    }
    return init
  })

  const missingEvaluationCount = useMemo(() => patients.filter((p) => !p.subjective).length, [patients])
  const missingHandoverBeds = useMemo(
    () =>
      patients
        .filter((p) => !String(draftByBed[p.bedLabel] ?? '').trim())
        .map((p) => p.bedLabel),
    [patients, draftByBed],
  )
  const isEvaluationDone = missingEvaluationCount === 0
  const isHandoverReportDone = missingHandoverBeds.length === 0

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">本班檢核</div>
            <div className="mt-1 text-xs text-slate-600">下班前檢查：交班內容 + 主觀麻煩度（未完成會提示）</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <FlowSteps
            steps={[
              {
                label: '交班報告',
                done: isHandoverReportDone,
                hint: isHandoverReportDone ? '已完成' : `尚缺：${missingHandoverBeds.join('、')}`,
                targetId: 'handover-content',
              },
              {
                label: '評估（主觀麻煩度）',
                done: isEvaluationDone,
                hint: isEvaluationDone ? '已完成' : `尚有 ${missingEvaluationCount} 位未填`,
                targetId: 'handover-burden',
              },
              { label: '任務確認', done: true, hint: '高風險不遺漏', targetId: 'handover-confirm' },
            ]}
          />
        </div>
      </section>

      <section id="handover-content" className="rounded-2xl bg-white p-6 ring-1 ring-black/10 scroll-mt-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">交班（本班接收 / 下班交班）</div>
            <div className="mt-1 text-xs text-slate-600">
              上班時先看上一班交班與麻煩度；下班前需完成本班交班內容與主觀麻煩度
            </div>
            <div className="mt-2 text-xs text-slate-600">
              上一班交班者：<span className="font-semibold text-slate-800">{handoverBy}</span>
              <span className="ml-2 text-slate-500">{new Date(handoverAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
            >
              產出交班報表
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <Card title="上一班交班摘要（已接收）" subtitle="依本班病患一覽的床位同步">
            <ul className="grid gap-2 text-sm text-slate-800">
              {patients.map((p) => {
                const h = handover.find((x) => x.bedLabel === p.bedLabel)
                return (
                  <li key={p.bedId} className="rounded-xl bg-[#fafaf8] p-3 ring-1 ring-black/5">
                    <div className="font-semibold">
                      {p.bedLabel} — {p.diagnosis}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{h?.summary ?? '—'}</div>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card title="本班交班輸入（下班前必填）" subtitle="可從 TO‑DO / 病患卡快速帶入重點">
            <div className="grid gap-3">
              {patients.map((p) => (
                <Field key={p.bedId} label={`${p.bedLabel} 重點交班`}>
                  <textarea
                    rows={4}
                    className="w-full resize-none rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="例：血壓/呼吸趨勢、用藥與滴速、抽血/影像結果、需追蹤事項…"
                    value={draftByBed[p.bedLabel] ?? ''}
                    onChange={(e) => setDraftByBed((prev) => ({ ...prev, [p.bedLabel]: e.target.value }))}
                  />
                </Field>
              ))}
              <div
                id="handover-confirm"
                className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3"
              >
                <div className="text-xs font-semibold text-[#b3341f]">
                  下班前檢查：交班內容 + 主觀麻煩度（未完成會提示）
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5"
                  >
                    儲存草稿
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
                    onClick={() => {
                      const problems: string[] = []
                      if (!isHandoverReportDone) problems.push(`交班報告未完成（${missingHandoverBeds.join('、')}）`)
                      if (!isEvaluationDone) problems.push(`評估未完成（尚有 ${missingEvaluationCount} 位未填）`)

                      if (problems.length > 0) {
                        window.alert(`交班前請先完成以下項目：\n- ${problems.join('\n- ')}`)
                        document.getElementById(!isHandoverReportDone ? 'handover-content' : 'handover-burden')?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start',
                        })
                        return
                      }

                      window.alert('已完成交班檢核（原型示意：此按鈕目前不會送出到後端）')
                    }}
                  >
                    送出交班
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section id="handover-burden" className="rounded-2xl bg-white p-6 ring-1 ring-black/10 scroll-mt-24">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">評估（主觀麻煩度）</div>
            <div className="mt-1 text-xs text-slate-600">下班前需完成所有病患主觀量表，才可交班。</div>
          </div>
          <Link
            to="/nurse/burden-form"
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
          >
            前往填寫
          </Link>
        </div>

        <div className="mt-4 rounded-2xl p-4 text-xs ring-1">
          {isEvaluationDone ? (
            <div className="bg-[#eaf7ee] text-[#1e6c3a] ring-[#b7e0c5] rounded-2xl p-4 ring-1">
              <div className="font-semibold">已完成全部評估</div>
              <div className="mt-1 text-[#1e6c3a]/90">主觀麻煩度皆已填寫，可進行交班。</div>
            </div>
          ) : (
            <div className="bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6] rounded-2xl p-4 ring-1">
              <div className="font-semibold">尚未完成</div>
              <div className="mt-1">仍有 {missingEvaluationCount} 位病患未填寫主觀量表，交班前會跳警告並阻擋送出。</div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-[#fffdf8] p-5 ring-1 ring-black/10">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 text-xs text-slate-600">{subtitle}</div> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function FlowSteps({
  steps,
}: {
  steps: { label: string; done: boolean; hint?: string; targetId?: string }[]
}) {
  return (
    <ol className="grid gap-3">
      <li className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-600">完成順序</div>
          <div className="text-xs text-slate-500">做完一個，下一個更清楚</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {steps.map((s, idx) => (
            <div key={s.label} className="grid gap-2">
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl p-1 text-left hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20"
                onClick={() => {
                  if (!s.targetId) return
                  document.getElementById(s.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                <span
                  className={[
                    'grid h-7 w-7 flex-none place-items-center rounded-full text-xs font-extrabold',
                    s.done ? 'bg-[#2f7a44] text-white' : 'bg-black/10 text-slate-700',
                  ].join(' ')}
                >
                  {idx + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{s.label}</span>
                  {s.hint ? <span className="block truncate text-xs text-slate-500">{s.hint}</span> : null}
                </span>
              </button>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
                <div
                  className={['h-full', s.done ? 'bg-[#2f7a44]' : 'bg-black/15'].join(' ')}
                  style={{ width: s.done ? '100%' : '35%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </li>
    </ol>
  )
}

