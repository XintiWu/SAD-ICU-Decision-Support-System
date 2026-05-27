import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { INITIAL_BY_NURSE, NURSES, type NurseId } from '../data/allocationMock'
import {
  formatBurdenHistoryTime,
  getLatestBurdenHistory,
  saveBurdenHistory,
  type BurdenBedScore,
} from '../state/burdenFormHistoryStore'
import {
  getHandoverSnapshot,
  listHandoverSnapshots,
} from '../state/handoverSnapshotStore'
import {
  getDemoPatients,
  objectiveTotal,
  setDemoPatients,
  subjectiveTotal,
  type BedId,
  type ObjectiveFactorKey,
  type Patient,
  type SubjectiveLevel,
  type SubjectiveFactors,
} from '../state/demoStore'

const SUBJECTIVE_REQUIRED_KEY = 'RASS 鎮靜分數（原始數值）' as const satisfies keyof SubjectiveFactors
const SUBJECTIVE_REQUIRED_LABEL = 'RASS 鎮靜分數'

function buildScoresMap(rows: Patient[]): Partial<Record<BedId, BurdenBedScore>> {
  const scores: Partial<Record<BedId, BurdenBedScore>> = {}
  for (const p of rows) {
    const s = p.subjective ?? defaultSubjective()
    const subjective = subjectiveTotal(s)
    const objective = objectiveTotal(p.objective)
    scores[p.bedId] = { total: subjective + objective, subjective, objective }
  }
  return scores
}

function getIncompleteFields(p: Patient): string[] {
  const s = p.subjective
  if (!s) return [SUBJECTIVE_REQUIRED_LABEL]
  return s[SUBJECTIVE_REQUIRED_KEY] == null ? [SUBJECTIVE_REQUIRED_LABEL] : []
}

function getPreviousScores(): Partial<Record<BedId, BurdenBedScore>> | null {
  const latest = getLatestBurdenHistory()
  if (latest && Object.keys(latest.scores).length > 0) return latest.scores
  const items = listHandoverSnapshots()
  if (items.length === 0) return null
  const snap = getHandoverSnapshot(items[0].id)
  if (!snap) return null
  const scores: Partial<Record<BedId, BurdenBedScore>> = {}
  for (const p of snap.patients) {
    const s = p.subjective ? subjectiveTotal(p.subjective) : 0
    const o = objectiveTotal(p.objective)
    scores[p.bedId] = { total: s + o, subjective: s, objective: o }
  }
  return scores
}

export function BurdenFormPage() {
  const currentNurseId: NurseId = 'n1'
  const [tab, setTab] = useState<'客觀' | '主觀'>('主觀')
  const [subjectiveMode, setSubjectiveMode] = useState<'上一班' | '本班'>('上一班')
  const [allRows, setAllRows] = useState<Patient[]>(() => getDemoPatients())
  const [toast, setToast] = useState<{ message: string; tone: 'ok' } | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const objectiveLayout = useMemo(() => {
    const row = (key: ObjectiveFactorKey, label: string, hint?: string) => ({ key, label, hint })
    return [
      {
        no: 1,
        title: '是否需住在負壓隔離病房',
        compactTitle: '負壓隔離病房',
        rows: [row('負壓隔離病房', '負壓隔離病房')],
      },
      {
        no: 2,
        title: '高呼吸器需求',
        hint: 'PEEP > 10 或 FiO₂ 約 ≥ 50% 即算',
        compactTitle: '高呼吸器需求',
        rows: [row('高呼吸器需求', '高呼吸器需求')],
      },
      {
        no: 3,
        title: '藥物計數',
        compactTitle: '藥物計數',
        rows: [row('藥物種類數', '藥物種類數'), row('藥物使用頻率', '藥物使用頻率')],
      },
      {
        no: 4,
        title: '特殊檢查項目',
        compactTitle: '特殊檢查',
        rows: [
          row('CRRT（持續型 A）', 'CRRT', '持續型 A'),
          row('IABP（持續型 B）', 'IABP', '持續型 B'),
          row('ECMO（持續型 B）', 'ECMO', '持續型 B'),
          row('PRONE（持續型B）', 'PRONE', '持續型 B'),
          row('低溫治療（持續性 B）', '低溫治療', '持續型 B'),
          row('大量輸血（單次 C）', '大量輸血', '單次 C'),
          row('跟Plasma（單次C）', 'Plasma', '單次 C'),
        ],
      },
    ] as const
  }, [])

  const assignedBedIds = useMemo(() => {
    const ids = INITIAL_BY_NURSE[currentNurseId] ?? []
    return new Set(
      ids.map((pid) => {
        const n = Number(pid.slice(1))
        return (`bed${n}` as BedId) satisfies BedId
      }),
    )
  }, [currentNurseId])

  const rows = useMemo(
    () => allRows.filter((r) => assignedBedIds.has(r.bedId)),
    [allRows, assignedBedIds],
  )

  const incompleteByBed = useMemo(() => {
    const map = new Map<BedId, string[]>()
    for (const r of rows) {
      const fields = getIncompleteFields(r)
      if (fields.length > 0) map.set(r.bedId, fields)
    }
    return map
  }, [rows])

  const missingCount = incompleteByBed.size

  const incompleteBedLabels = useMemo(
    () =>
      rows
        .filter((r) => incompleteByBed.has(r.bedId))
        .map((r) => r.bedLabel)
        .join('、'),
    [rows, incompleteByBed],
  )

  const previousScores = useMemo(() => getPreviousScores(), [historyVersion])
  const previousLabel = useMemo(() => {
    const latest = getLatestBurdenHistory()
    if (latest) return `${latest.label}（${formatBurdenHistoryTime(latest.savedAt)}）`
    const items = listHandoverSnapshots()
    if (items.length > 0) return '上次交班快照'
    return null
  }, [historyVersion])

  const previousSnapshot = useMemo(() => {
    const items = listHandoverSnapshots()
    if (items.length === 0) return null
    return getHandoverSnapshot(items[0].id)
  }, [])

  const previousSnapshotRows = useMemo(() => {
    if (!previousSnapshot) return []
    return previousSnapshot.patients.filter((p) => assignedBedIds.has(p.bedId))
  }, [previousSnapshot, assignedBedIds])

  const persistRows = useCallback((label: string) => {
    setDemoPatients(allRows)
    saveBurdenHistory(buildScoresMap(rows), label)
    setHistoryVersion((v) => v + 1)
  }, [allRows, rows])

  const handleSubmit = useCallback(() => {
    if (missingCount > 0) {
      setTab('主觀')
      return
    }
    persistRows('已送出')
    setToast({ message: '已送出本班主觀評估', tone: 'ok' })
  }, [missingCount, persistRows])

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm font-semibold text-slate-900">麻煩程度評估</div>
            <div className="inline-flex shrink-0 overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-black/15 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <SegTab active={tab === '客觀'} onClick={() => setTab('客觀')}>
                客觀（系統）
              </SegTab>
              <SegTab active={tab === '主觀'} onClick={() => setTab('主觀')}>
                主觀（自填）
              </SegTab>
            </div>
            {tab === '主觀' ? (
              <div className="inline-flex shrink-0 overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-black/10">
                <SegTab active={subjectiveMode === '上一班'} onClick={() => setSubjectiveMode('上一班')}>
                  查看上一班
                </SegTab>
                <SegTab active={subjectiveMode === '本班'} onClick={() => setSubjectiveMode('本班')}>
                  填寫本班
                </SegTab>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-start justify-between gap-3 sm:w-auto sm:justify-end">
          <div className="min-w-0 text-right text-xs text-slate-600">
            <div className="truncate">客觀＝由醫囑/用藥自動計算；主觀＝護理師自評（下班前必完成）</div>
            <div className="mt-1 truncate">目前僅顯示：{NURSES[currentNurseId].shortName} 分配到的病患</div>
          </div>
          {tab === '客觀' ? (
            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500 ring-1 ring-black/5">
              僅供檢視
            </span>
          ) : null}
        </div>
      </div>

      {tab === '主觀' && subjectiveMode === '本班' && missingCount > 0 ? (
        <div
          className="mt-4 rounded-xl bg-[#ffe8e1] px-4 py-3 text-sm font-semibold text-[#b3341f] ring-1 ring-[#f2b3a6]"
          role="status"
          aria-live="polite"
        >
          尚有 {missingCount} 位病患未完成：{incompleteBedLabels}
        </div>
      ) : null}

      {toast ? (
        <div
          className="mt-4 rounded-xl bg-[#eaf7ee] px-4 py-3 text-sm font-semibold text-[#1e6c3a] ring-1 ring-[#b7e0c5]"
          role="status"
        >
          {toast.message}
        </div>
      ) : null}

      {tab === '客觀' ? (
        <div className="mt-6 grid gap-4">
          <div className="-mx-6 px-6">
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((p) => {
                const total = objectiveTotal(p.objective)

                return (
                  <div key={p.bedId} className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold tracking-tight text-slate-900">
                          {p.bedLabel} <span className="font-semibold text-slate-700">— {p.diagnosis}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          系統自動計算 · 僅供檢視，無法編輯或儲存
                        </div>
                      </div>
                      <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-right">
                        <div className="text-[10px] font-semibold text-slate-500">客觀總分</div>
                        <div className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-800 tabular-nums">
                          {total}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50/80 p-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        {objectiveLayout.flatMap((sec) => [
                          <div
                            key={`h-${sec.no}`}
                            className="md:col-span-2 flex flex-wrap items-baseline justify-between gap-2 pt-1"
                          >
                            <div className="text-xs font-extrabold text-slate-800">
                              {sec.no}. {sec.compactTitle}
                            </div>
                            {'hint' in sec && sec.hint ? (
                              <div className="text-[11px] font-medium text-slate-500">{sec.hint}</div>
                            ) : null}
                          </div>,
                          ...sec.rows.map((r) => (
                            <div
                              key={r.key}
                              className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-1 py-2 last:border-0"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate text-xs font-medium text-slate-600">{r.label}</div>
                                  {r.hint ? (
                                    <span className="text-[10px] font-medium text-slate-400">{r.hint}</span>
                                  ) : null}
                                </div>
                              </div>
                              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">
                                {p.objective[r.key]}
                              </span>
                            </div>
                          )),
                        ])}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : subjectiveMode === '上一班' ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-4">
            {previousSnapshotRows.length === 0 ? (
              <div className="rounded-2xl bg-surface p-5 text-sm font-semibold text-slate-600 ring-1 ring-black/10">
                找不到上一班資料（尚未建立交班快照）
              </div>
            ) : (
              previousSnapshotRows
                .slice(0, Math.ceil(previousSnapshotRows.length / 2))
                .map((p) => <SubjectivePatientReadonlyCard key={p.bedId} patient={p} />)
            )}
          </div>
          <div className="grid gap-4">
            {previousSnapshotRows.length > 0
              ? previousSnapshotRows
                  .slice(Math.ceil(previousSnapshotRows.length / 2))
                  .map((p) => <SubjectivePatientReadonlyCard key={p.bedId} patient={p} />)
              : null}
          </div>
          <div className="lg:sticky lg:top-6">
            <SubjectiveSummarySingle rows={previousSnapshotRows} />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-4">
            {rows
              .slice(0, Math.ceil(rows.length / 2))
              .map((p) => (
                <SubjectivePatientCard
                  key={p.bedId}
                  patient={p}
                  incompleteFields={incompleteByBed.get(p.bedId)}
                  onChange={(patch) => {
                    setAllRows((prev) =>
                      prev.map((x) =>
                        x.bedId === p.bedId
                          ? { ...x, subjective: { ...(x.subjective ?? defaultSubjective()), ...patch } }
                          : x,
                      ),
                    )
                  }}
                />
              ))}
          </div>
          <div className="grid gap-4">
            {rows
              .slice(Math.ceil(rows.length / 2))
              .map((p) => (
                <SubjectivePatientCard
                  key={p.bedId}
                  patient={p}
                  incompleteFields={incompleteByBed.get(p.bedId)}
                  onChange={(patch) => {
                    setAllRows((prev) =>
                      prev.map((x) =>
                        x.bedId === p.bedId
                          ? { ...x, subjective: { ...(x.subjective ?? defaultSubjective()), ...patch } }
                          : x,
                      ),
                    )
                  }}
                />
              ))}
          </div>
          <div className="lg:sticky lg:top-6">
            <SubjectiveSummary
              rows={rows}
              previousScores={previousScores}
              previousLabel={previousLabel}
            />
          </div>
        </div>
      )}

      {tab === '主觀' && subjectiveMode === '本班' ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            {missingCount > 0 ? (
              <span className="text-base font-extrabold text-[#b3341f]">
                {missingCount} 位病患尚有欄位未填寫（請完成所有項目後再送出）
              </span>
            ) : (
              <span className="text-sm font-semibold text-[#1e6c3a]">已完成全部填寫，可以送出</span>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 active:scale-[0.98]"
            >
              送出
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-[#fff7ed] p-4 text-xs text-[#9a5b1a] ring-1 ring-[#f1d7b8]">
        <div className="font-semibold">客觀量化指標（最新定義）</div>
        <div className="mt-1">
          1. 負壓隔離病房 2. 高呼吸器需求（PEEP&gt;10 或 FiO₂≈50%） 3. 藥物計數（種類數/頻率） 4. 特殊檢查（A/B/C）
          <span className="pl-2 font-semibold">客觀分數僅顯示系統計算結果，不提供手動更改。</span>
        </div>
      </div>
    </div>
  )
}

function defaultSubjective() {
  return {
    'RASS 鎮靜分數（原始數值）': null,
    '躁動且有下床風險': false,
    '躁動且有拔管風險': false,
    引流管: false,
    '需人工管灌': false,
    '換藥頻繁程度': 0,
    '生理狀態監測頻繁程度': 0,
  } satisfies SubjectiveFactors
}

function statusPill(total: number) {
  if (total >= 22) return { label: '高', cls: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]' }
  if (total >= 14) return { label: '中', cls: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]' }
  return { label: '低', cls: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]' }
}

function SubjectivePatientReadonlyCard({ patient }: { patient: Patient }) {
  const s = patient.subjective ?? defaultSubjective()
  const sTotal = patient.subjective ? subjectiveTotal(s) : 0
  const oTotal = objectiveTotal(patient.objective)
  const total = sTotal + oTotal
  const status = statusPill(total)

  const yesNo = (v: boolean) => (v ? '是' : '否')
  const level = (v: SubjectiveLevel) => (v === 2 ? '高' : v === 1 ? '中' : '低')
  const rass = s['RASS 鎮靜分數（原始數值）']

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold tracking-tight text-slate-900">
            {patient.bedLabel} <span className="font-semibold text-slate-700">— {patient.diagnosis}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-surface px-3 py-1 font-semibold ring-1 ring-black/10">
              主觀 {sTotal}
            </span>
            <span className="rounded-full bg-surface px-3 py-1 font-semibold ring-1 ring-black/10">
              客觀 {oTotal}
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-extrabold text-slate-900 ring-1 ring-black/10">
              總分 {total}
            </span>
            <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${status.cls}`}>{status.label}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 ring-1 ring-black/5">
              上一班（唯讀）
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl bg-surface p-3 ring-1 ring-black/5">
        <ReadonlyRow label="RASS 鎮靜分數（原始數值）" value={rass == null ? '—' : String(rass)} />
        <ReadonlyRow label="躁動且有下床風險" value={yesNo(s['躁動且有下床風險'])} />
        <ReadonlyRow label="躁動且有拔管風險" value={yesNo(s['躁動且有拔管風險'])} />
        <ReadonlyRow label="引流管" value={yesNo(s['引流管'])} />
        <ReadonlyRow label="需人工管灌" value={yesNo(s['需人工管灌'])} />
        <ReadonlyRow label="換藥頻繁程度" value={level(s['換藥頻繁程度'])} />
        <ReadonlyRow label="生理狀態監測頻繁程度" value={level(s['生理狀態監測頻繁程度'])} />
      </div>
    </section>
  )
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-black/10">
      <div className="min-w-0 truncate text-xs font-semibold text-slate-700">{label}</div>
      <div className="shrink-0 text-sm font-extrabold tabular-nums text-slate-900">{value}</div>
    </div>
  )
}

function SubjectiveSummarySingle({ rows }: { rows: Patient[] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
      <div className="bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-slate-600">上一班病患分數摘要（唯讀）</div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">上班查看用，不需填寫</div>
      </div>
      <div className="divide-y divide-black/10">
        {rows.map((p) => {
          const s = p.subjective ? subjectiveTotal(p.subjective) : 0
          const o = objectiveTotal(p.objective)
          const total = s + o
          const status = statusPill(total)
          return (
            <div key={p.bedId} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{p.bedLabel}</div>
                <div className="mt-0.5 truncate text-xs text-slate-600">{p.diagnosis}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs font-extrabold tabular-nums text-slate-900">{total}</div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
                    主 {s}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-black/10">
                    客 {o}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                </div>
              </div>
            </div>
          )
        })}
        {rows.length === 0 ? (
          <div className="px-4 py-4 text-sm font-semibold text-slate-500">—</div>
        ) : null}
      </div>
    </section>
  )
}

function SubjectivePatientCard({
  patient,
  incompleteFields,
  onChange,
}: {
  patient: Patient
  incompleteFields?: string[]
  onChange: (patch: Partial<SubjectiveFactors>) => void
}) {
  const s = patient.subjective ?? defaultSubjective()
  const sTotal = subjectiveTotal(s)
  const oTotal = objectiveTotal(patient.objective)
  const total = sTotal + oTotal
  const status = statusPill(total)
  const showIncomplete = incompleteFields && incompleteFields.length > 0

  return (
    <section
      className={[
        'rounded-2xl bg-white p-5 ring-1',
        showIncomplete ? 'ring-[#f2b3a6]' : 'ring-black/10',
      ].join(' ')}
    >
      {showIncomplete ? (
        <div className="mb-3 rounded-xl bg-[#fff7ed] px-3 py-2 text-xs text-[#9a5b1a] ring-1 ring-[#f1d7b8]">
          <span className="font-semibold">尚未完成：</span>
          {incompleteFields.join('、')}
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold tracking-tight text-slate-900">
            {patient.bedLabel} <span className="font-semibold text-slate-700">— {patient.diagnosis}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-surface px-3 py-1 font-semibold ring-1 ring-black/10">
              主觀 {sTotal}
            </span>
            <span className="rounded-full bg-surface px-3 py-1 font-semibold ring-1 ring-black/10">
              客觀 {oTotal}
            </span>
            <span className="rounded-full bg-white px-3 py-1 font-extrabold text-slate-900 ring-1 ring-black/10">
              總分 {total}
            </span>
            <span className={`inline-flex rounded-full px-3 py-1 font-semibold ${status.cls}`}>{status.label}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <SubjectiveRow label="RASS 鎮靜分數（原始數值）">
          <RassInput
            value={s['RASS 鎮靜分數（原始數值）']}
            onChange={(v) => {
              onChange({ 'RASS 鎮靜分數（原始數值）': v })
            }}
            ariaLabel={`${patient.bedLabel} RASS 鎮靜分數（原始數值）`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="躁動且有下床風險">
          <YesNoPicker
            value={s['躁動且有下床風險']}
            onChange={(v) => {
              onChange({ '躁動且有下床風險': v })
            }}
            ariaLabel={`${patient.bedLabel} 躁動且有下床風險`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="躁動且有拔管風險">
          <YesNoPicker
            value={s['躁動且有拔管風險']}
            onChange={(v) => {
              onChange({ '躁動且有拔管風險': v })
            }}
            ariaLabel={`${patient.bedLabel} 躁動且有拔管風險`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="引流管">
          <YesNoPicker
            value={s['引流管']}
            onChange={(v) => {
              onChange({ 引流管: v })
            }}
            ariaLabel={`${patient.bedLabel} 引流管`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="需人工管灌">
          <YesNoPicker
            value={s['需人工管灌']}
            onChange={(v) => {
              onChange({ '需人工管灌': v })
            }}
            ariaLabel={`${patient.bedLabel} 需人工管灌`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="換藥頻繁程度">
          <LevelPicker
            value={s['換藥頻繁程度']}
            onChange={(lvl) => {
              onChange({ '換藥頻繁程度': lvl })
            }}
            ariaLabel={`${patient.bedLabel} 換藥頻繁程度`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="生理狀態監測頻繁程度">
          <LevelPicker
            value={s['生理狀態監測頻繁程度']}
            onChange={(lvl) => {
              onChange({ '生理狀態監測頻繁程度': lvl })
            }}
            ariaLabel={`${patient.bedLabel} 生理狀態監測頻繁程度`}
          />
        </SubjectiveRow>
      </div>
    </section>
  )
}

function DeltaCell({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous == null) return <span className="text-slate-400">—</span>
  const delta = current - previous
  if (delta === 0) return <span className="text-slate-500">0</span>
  const up = delta > 0
  return (
    <span className={['font-extrabold tabular-nums', up ? 'text-[#b3341f]' : 'text-[#1e6c3a]'].join(' ')}>
      {up ? '+' : '−'}
      {Math.abs(delta)}
    </span>
  )
}

function SubjectiveSummary({
  rows,
  previousScores,
  previousLabel,
}: {
  rows: Patient[]
  previousScores: Partial<Record<BedId, BurdenBedScore>> | null
  previousLabel: string | null
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
      <div className="bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-slate-600">本班病患分數摘要</div>
        {previousLabel && previousScores ? (
          <div className="mt-1 text-[10px] font-medium text-slate-500">
            對照：{previousLabel}
          </div>
        ) : (
          <div className="mt-1 text-[10px] font-medium text-slate-400">尚無歷史紀錄可對照</div>
        )}
      </div>
      <div className="divide-y divide-black/10">
        {rows.map((p) => {
          const s = p.subjective ?? defaultSubjective()
          const sTotal = subjectiveTotal(s)
          const oTotal = objectiveTotal(p.objective)
          const total = sTotal + oTotal
          const status = statusPill(total)
          const prev = previousScores?.[p.bedId]
          const prevStatus = prev ? statusPill(prev.total) : null
          return (
            <div key={p.bedId} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{p.bedLabel}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-600">{p.diagnosis}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-black/10">
                <div className="grid grid-cols-[64px_1fr_1fr_1fr_56px] bg-surface px-3 py-2 text-[10px] font-semibold text-slate-600">
                  <div />
                  <div className="text-center">主觀</div>
                  <div className="text-center">客觀</div>
                  <div className="text-center">總分</div>
                  <div className="text-center">負荷</div>
                </div>

                <div className="grid grid-cols-[64px_1fr_1fr_1fr_56px] items-center px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-700">前一次</div>
                  <div className="text-center font-semibold tabular-nums text-slate-800">{prev ? prev.subjective : '—'}</div>
                  <div className="text-center font-semibold tabular-nums text-slate-800">{prev ? prev.objective : '—'}</div>
                  <div className="text-center font-semibold tabular-nums text-slate-800">{prev ? prev.total : '—'}</div>
                  <div className="text-center">
                    {prevStatus ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${prevStatus.cls}`}>{prevStatus.label}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[64px_1fr_1fr_1fr_56px] items-center border-t border-black/10 px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-700">這一次</div>
                  <div className="text-center font-extrabold tabular-nums text-slate-900">{sTotal}</div>
                  <div className="text-center font-extrabold tabular-nums text-slate-900">{oTotal}</div>
                  <div className="text-center font-extrabold tabular-nums text-slate-900">{total}</div>
                  <div className="text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                  </div>
                </div>

                <div className="grid grid-cols-[64px_1fr_1fr_1fr_56px] items-center border-t border-black/10 bg-white px-3 py-2 text-xs">
                  <div className="font-semibold text-slate-700">變化</div>
                  <div className="text-center tabular-nums">
                    <DeltaCell current={sTotal} previous={prev?.subjective} />
                  </div>
                  <div className="text-center tabular-nums">
                    <DeltaCell current={oTotal} previous={prev?.objective} />
                  </div>
                  <div className="text-center tabular-nums">
                    <DeltaCell current={total} previous={prev?.total} />
                  </div>
                  <div className="text-center text-[10px] font-semibold text-slate-500">
                    {prevStatus ? (prevStatus.label === status.label ? '—' : `${prevStatus.label}→${status.label}`) : '—'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SubjectiveRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[200px_1fr] sm:items-center sm:gap-3">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      {children}
    </div>
  )
}

function YesNoPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <BinaryButton
        variant="yes"
        active={value === true}
        onClick={() => onChange(true)}
        ariaLabel={`${ariaLabel} 是`}
      >
        是
      </BinaryButton>
      <BinaryButton
        variant="no"
        active={value === false}
        onClick={() => onChange(false)}
        ariaLabel={`${ariaLabel} 否`}
      >
        否
      </BinaryButton>
    </div>
  )
}

function RassInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number | null
  onChange: (v: number | null) => void
  ariaLabel: string
}) {
  const display = value == null ? '' : String(value)
  return (
    <div className="flex items-center gap-2">
      <input
        aria-label={ariaLabel}
        inputMode="numeric"
        className="w-24 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        placeholder="—"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.trim()
          if (raw === '') return onChange(null)
          const n = Number(raw)
          if (!Number.isFinite(n)) return
          onChange(Math.trunc(n))
        }}
      />
      <span className="text-xs text-slate-500">範圍常見 -5～+4</span>
    </div>
  )
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
      <SquareToneButton
        tone="low"
        active={value === 0}
        onClick={() => onChange(0)}
        ariaLabel={`${ariaLabel} 低`}
      >
        低
      </SquareToneButton>
      <SquareToneButton
        tone="mid"
        active={value === 1}
        onClick={() => onChange(1)}
        ariaLabel={`${ariaLabel} 中`}
      >
        中
      </SquareToneButton>
      <SquareToneButton
        tone="high"
        active={value === 2}
        onClick={() => onChange(2)}
        ariaLabel={`${ariaLabel} 高`}
      >
        高
      </SquareToneButton>
    </div>
  )
}

function SquareToneButton({
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
          active: 'bg-[#c64a2c] text-white ring-[#c64a2c]/30',
          focus: 'focus-visible:ring-[#c64a2c]/35',
        }
      : tone === 'mid'
        ? {
            pill: 'bg-[#fff7ed] text-[#9a5b1a] ring-[#f1d7b8]',
            active: 'bg-[#d88b2c] text-white ring-[#d88b2c]/30',
            focus: 'focus-visible:ring-[#d88b2c]/35',
          }
        : {
            pill: 'bg-[#eaf7ee] text-[#1e6c3a] ring-[#b7e0c5]',
            active: 'bg-[#2f7a44] text-white ring-[#2f7a44]/30',
            focus: 'focus-visible:ring-[#2f7a44]/35',
          }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'inline-flex h-9 min-w-12 items-center justify-center rounded-xl px-3 text-xs font-extrabold tracking-wide transition',
        'ring-1 focus:outline-none focus-visible:ring-2',
        palette.focus,
        active
          ? `${palette.active} shadow-sm`
          : `${palette.pill} hover:brightness-[0.98] hover:shadow-[0_1px_0_rgba(0,0,0,0.04)]`,
      ].join(' ')}
    >
      <span className="leading-none">{children}</span>
    </button>
  )
}

function BinaryButton({
  variant,
  active,
  onClick,
  children,
  ariaLabel,
}: {
  variant: 'yes' | 'no'
  active: boolean
  onClick: () => void
  children: ReactNode
  ariaLabel: string
}) {
  const base =
    // 讓「是/否」兩顆（含 gap-2 的間距）總寬 ≒ 「低/中/高」三顆總寬：
    // 低中高：3 * 48px + 2 * 8px = 160px
    // 是/否：2 * 76px + 1 * 8px = 160px
    'inline-flex h-9 min-w-[4.75rem] items-center justify-center rounded-xl px-3 text-xs font-extrabold tracking-wide transition ring-1 focus:outline-none focus-visible:ring-2 active:scale-[0.98] active:brightness-95'
  const focus = 'focus-visible:ring-black/25'
  const on =
    variant === 'yes'
      ? 'bg-black text-white ring-black shadow-sm'
      : 'bg-slate-700 text-white ring-slate-700 shadow-sm'
  const off =
    variant === 'yes'
      ? 'bg-white text-slate-900 ring-black/20 hover:bg-black/5'
      : 'bg-white text-slate-700 ring-black/15 hover:bg-slate-50'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[base, focus, active ? on : off].join(' ')}
    >
      {children}
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
        'rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25',
        active
          ? 'bg-black text-white shadow-sm ring-1 ring-black'
          : 'bg-white text-slate-700 ring-1 ring-black/10 hover:bg-black/5 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

