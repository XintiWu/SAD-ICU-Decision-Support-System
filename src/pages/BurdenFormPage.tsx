import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import {
  deriveObjectiveAndTodos,
  getDemoPatients,
  getDemoTasks,
  getLastImportedAt,
  objectiveTotal,
  parseOrders,
  setDemoPatients,
  setDemoTasks,
  setLastImportedAt,
  subjectiveTotal,
  type ObjectiveFactorKey,
  type Patient,
  type SubjectiveLevel,
  type SubjectiveFactorKey,
} from '../state/demoStore'

export function BurdenFormPage() {
  const [tab, setTab] = useState<'客觀' | '主觀'>('主觀')
  const [rows, setRows] = useState<Patient[]>(() => getDemoPatients())
  const [rawOrders, setRawOrders] = useState<string>(
    [
      '床 2: Vancomycin q12h',
      '床 2: Norepinephrine drip',
      '床 2: CBC/Diff',
      '床 1: Q1H 血壓監測',
    ].join('\n'),
  )

  const missingCount = useMemo(
    () => rows.filter((r) => !r.subjective).length,
    [rows],
  )

  const lastAt = getLastImportedAt()

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">麻煩程度評估</div>
          <div className="mt-1 text-xs text-slate-600">
            客觀＝由醫囑/用藥自動計算；主觀＝護理師自評（下班前必完成）
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDemoPatients(rows)}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
        >
          儲存
        </button>
      </div>

      <div className="mt-5">
        <div className="inline-flex overflow-hidden rounded-2xl bg-[#fafaf8] p-1 ring-1 ring-black/10">
          <SegTab active={tab === '客觀'} onClick={() => setTab('客觀')}>
            客觀（系統）
          </SegTab>
          <SegTab active={tab === '主觀'} onClick={() => setTab('主觀')}>
            主觀（自填）
          </SegTab>
        </div>
      </div>

      {tab === '客觀' ? (
        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl bg-[#fafaf8] p-5 ring-1 ring-black/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">匯入醫囑（客觀指標 + TO‑DO）</div>
                <div className="mt-1 text-xs text-slate-600">
                  每行一筆並標註床號；匯入後會更新下方客觀五項指標，並同步轉成待辦。
                  {lastAt ? <span className="ml-2 text-slate-500">上次匯入：{new Date(lastAt).toLocaleString()}</span> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const parsed = parseOrders(rawOrders)
                  const map = deriveObjectiveAndTodos(parsed)

                  const nextPatients = rows.map((p) => {
                    const x = map.get(p.bedLabel)
                    if (!x) return p
                    const nextObjective = { ...p.objective }
                    for (const [k, v] of Object.entries(x.objective) as [ObjectiveFactorKey, number][]) {
                      nextObjective[k] = Math.max(0, (nextObjective[k] ?? 0) + (v ?? 0))
                    }
                    return { ...p, objective: nextObjective }
                  })

                  const nextTasks = [...getDemoTasks()]
                  for (const [, x] of map.entries()) {
                    for (const t of x.tasks) {
                      const exists = nextTasks.some((k) => k.title === t.title && k.kind === t.kind && k.bedLabel.startsWith(t.bedLabel.slice(0, 3)))
                      if (!exists) nextTasks.unshift(t)
                    }
                  }

                  setRows(nextPatients)
                  setDemoPatients(nextPatients)
                  setDemoTasks(nextTasks)
                  setLastImportedAt(new Date().toISOString())
                }}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90"
              >
                匯入並更新
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <textarea
                rows={7}
                value={rawOrders}
                onChange={(e) => setRawOrders(e.target.value)}
                className="w-full resize-none rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder={'例：\n床 2: Vancomycin q12h\n床 2: CBC/Diff\n床 1: Q1H 血壓監測'}
              />
              <div className="text-xs text-slate-500">
                提醒：這裡先用「文字貼上」做原型，之後可再接 EMR/醫囑系統匯入。
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-black/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">床號 / 診斷</th>
                  <th className="px-4 py-3 font-semibold">病情嚴重度</th>
                  <th className="px-4 py-3 font-semibold">藥物與輸液頻率</th>
                  <th className="px-4 py-3 font-semibold">檢查與處置次數</th>
                  <th className="px-4 py-3 font-semibold">監測需求</th>
                  <th className="px-4 py-3 font-semibold">特殊照護需求</th>
                  <th className="px-4 py-3 font-semibold">客觀總分</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.bedId} className="border-t border-black/10">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {p.bedLabel} — {p.diagnosis}
                    </td>
                    {(
                      [
                        '病情嚴重度',
                        '藥物與輸液頻率',
                        '檢查與處置次數',
                        '監測需求',
                        '特殊照護需求',
                      ] as ObjectiveFactorKey[]
                    ).map((k) => (
                      <td key={k} className="px-4 py-3">
                        <input
                          inputMode="numeric"
                          value={p.objective[k]}
                          onChange={(e) => {
                            const n = Number(e.target.value)
                            setRows((prev) =>
                              prev.map((x) =>
                                x.bedId === p.bedId
                                  ? { ...x, objective: { ...x.objective, [k]: Number.isFinite(n) ? n : 0 } }
                                  : x,
                              ),
                            )
                          }}
                          className="w-16 rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-black/10 focus:outline-none focus:ring-2 focus:ring-black"
                          aria-label={`${p.bedLabel} ${k}`}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 font-semibold text-slate-900">{objectiveTotal(p.objective)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          <div className="overflow-hidden rounded-2xl ring-1 ring-black/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">床號 / 診斷</th>
                  <th className="px-4 py-3 font-semibold">主觀（多項目）</th>
                  <th className="px-4 py-3 font-semibold">主觀總分</th>
                  <th className="px-4 py-3 font-semibold">客觀總分</th>
                  <th className="px-4 py-3 font-semibold">總分</th>
                  <th className="px-4 py-3 font-semibold">狀態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const s = p.subjective ?? defaultSubjective()
                  const sTotal = subjectiveTotal(s)
                  const oTotal = objectiveTotal(p.objective)
                  const total = sTotal + oTotal
                  const status =
                    total >= 22
                      ? { label: '高', cls: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]' }
                      : total >= 14
                        ? { label: '中', cls: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]' }
                        : { label: '低', cls: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]' }

                  return (
                    <tr key={p.bedId} className="border-t border-black/10 align-top">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {p.bedLabel} — {p.diagnosis}
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid gap-2">
                          {(
                            [
                              '病人活動/翻身協助',
                              '給藥與點滴處理',
                              '檢查與處置配合',
                              '監測與紀錄頻率',
                              '呼吸道/管路照護',
                              '傷口/皮膚照護',
                              '家屬溝通與衛教',
                              '文書/交班整理',
                            ] as SubjectiveFactorKey[]
                          ).map((k) => (
                            <div key={k} className="grid grid-cols-[160px_1fr] items-center gap-3">
                              <div className="text-xs font-semibold text-slate-700">{k}</div>
                              <LevelPicker
                                value={s[k]}
                                onChange={(lvl) => {
                                  setRows((prev) =>
                                    prev.map((x) =>
                                      x.bedId === p.bedId
                                        ? {
                                            ...x,
                                            subjective: {
                                              ...(x.subjective ?? defaultSubjective()),
                                              [k]: lvl,
                                            },
                                          }
                                        : x,
                                    ),
                                  )
                                }}
                                ariaLabel={`${p.bedLabel} ${k}`}
                              />
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{sTotal}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{oTotal}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{total}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          {missingCount > 0 ? (
            <span className="font-semibold text-[#b3341f]">
              {missingCount} 位病患尚未填寫主觀量表
            </span>
          ) : (
            <span className="font-semibold text-[#1e6c3a]">已完成全部填寫</span>
          )}
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
          >
            送出
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#fff7ed] p-4 text-xs text-[#9a5b1a] ring-1 ring-[#f1d7b8]">
        <div className="font-semibold">客觀五項量化指標（你提供的模型）</div>
        <div className="mt-1">
          病情嚴重度、藥物與輸液頻率、檢查與處置次數、監測需求、特殊照護需求。
          系統可由醫囑自動推估，也允許人工調整以符合現場實況。
        </div>
      </div>
    </div>
  )
}

function defaultSubjective() {
  return {
    '病人活動/翻身協助': 0,
    '給藥與點滴處理': 0,
    '檢查與處置配合': 0,
    '監測與紀錄頻率': 0,
    '呼吸道/管路照護': 0,
    '傷口/皮膚照護': 0,
    '家屬溝通與衛教': 0,
    '文書/交班整理': 0,
  } as const
}

function LevelPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: SubjectiveLevel
  onChange: (lvl: SubjectiveLevel) => void
  ariaLabel: string
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <LevelButton
        tone="low"
        active={value === 0}
        onClick={() => onChange(0)}
        ariaLabel={`${ariaLabel} 低`}
      >
        低
      </LevelButton>
      <LevelButton
        tone="mid"
        active={value === 1}
        onClick={() => onChange(1)}
        ariaLabel={`${ariaLabel} 中`}
      >
        中
      </LevelButton>
      <LevelButton
        tone="high"
        active={value === 2}
        onClick={() => onChange(2)}
        ariaLabel={`${ariaLabel} 高`}
      >
        高
      </LevelButton>
    </div>
  )
}

function LevelButton({
  tone,
  active,
  onClick,
  children,
  ariaLabel,
}: {
  tone: 'low' | 'mid' | 'high'
  active: boolean
  onClick: () => void
  children: ReactNode
  ariaLabel: string
}) {
  const palette =
    tone === 'high'
      ? {
          pill: 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]',
          dot: 'bg-[#c64a2c]',
          active: 'bg-[#c64a2c] text-white ring-[#c64a2c]/30',
          focus: 'focus-visible:ring-[#c64a2c]/35',
        }
      : tone === 'mid'
        ? {
            pill: 'bg-[#fff7ed] text-[#9a5b1a] ring-[#f1d7b8]',
            dot: 'bg-[#d88b2c]',
            active: 'bg-[#d88b2c] text-white ring-[#d88b2c]/30',
            focus: 'focus-visible:ring-[#d88b2c]/35',
          }
        : {
            pill: 'bg-[#eaf7ee] text-[#1e6c3a] ring-[#b7e0c5]',
            dot: 'bg-[#2f7a44]',
            active: 'bg-[#2f7a44] text-white ring-[#2f7a44]/30',
            focus: 'focus-visible:ring-[#2f7a44]/35',
          }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition',
        'ring-1 focus:outline-none focus-visible:ring-2',
        palette.focus,
        active
          ? `${palette.active} shadow-sm`
          : `${palette.pill} hover:brightness-[0.98] hover:shadow-[0_1px_0_rgba(0,0,0,0.04)]`,
      ].join(' ')}
    >
      <span className={['h-1.5 w-1.5 rounded-full', active ? 'bg-white/90' : palette.dot].join(' ')} />
      <span className="leading-none">{children}</span>
    </button>
  )
}

function SegTab({
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
        'rounded-xl px-4 py-2 text-sm font-semibold transition',
        active ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/10' : 'text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

