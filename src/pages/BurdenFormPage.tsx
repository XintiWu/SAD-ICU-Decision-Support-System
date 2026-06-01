import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  apiGet,
  apiPatch,
  type ApiNurse,
  type BurdenAssessment,
  type SubjectivePayload,
} from '../api/client'
import { EmptyAssignedPatientsNotice } from '../components/EmptyAssignedPatientsNotice'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/useShift'
import { useUser } from '../context/useUser'
import {
  assessmentToRow,
  getIncompleteFields,
  objectiveTotal,
  OBJECTIVE_LAYOUT,
  subjectiveTotal,
  type BurdenFormRow,
} from '../lib/burdenFactors'

type BedScore = { total: number; subjective: number; objective: number }

type SubjectiveLevel = SubjectivePayload['dressingChangeFrequency']

function findPreviousShift(shifts: { id: string; startsAt: string; label: string }[], currentShiftId: string) {
  const sorted = [...shifts].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  )
  const idx = sorted.findIndex((s) => s.id === currentShiftId)
  if (idx <= 0) return null
  return sorted[idx - 1]
}

function buildScoresMap(rows: BurdenFormRow[]): Partial<Record<string, BedScore>> {
  const scores: Partial<Record<string, BedScore>> = {}
  for (const row of rows) {
    const subjective = row.subjective ? subjectiveTotal(row.subjective) : 0
    const objective = objectiveTotal(row.objective)
    scores[row.admissionId] = { total: subjective + objective, subjective, objective }
  }
  return scores
}

export function BurdenFormPage() {
  const { shiftId } = useShift()
  const { userId } = useUser()
  return <BurdenFormPageBody key={`${shiftId}:${userId}`} />
}

function BurdenFormPageBody() {
  const { shiftId, shifts } = useShift()
  const { userId, user, loading: userLoading, error: userError } = useUser()
  const chargeNurseId = useChargeNurseId()
  const nurseShortName = user?.shortName ?? '—'
  const nurseDisplayName = formatNurseDisplay(nurseShortName, { nurseId: userId, chargeNurseId })

  const [tab, setTab] = useState<'客觀' | '主觀'>('主觀')
  const [subjectiveMode, setSubjectiveMode] = useState<'上一班' | '本班'>('上一班')
  const [rows, setRows] = useState<BurdenFormRow[]>([])
  const [previousRows, setPreviousRows] = useState<BurdenFormRow[]>([])
  const [previousLabel, setPreviousLabel] = useState<string | null>(null)
  const [onRoster, setOnRoster] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'ok' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const [current, nurses] = await Promise.all([
          apiGet<BurdenAssessment[]>(
            `/burden-assessments?shiftId=${shiftId}&scope=mine`,
            { userId },
          ),
          apiGet<ApiNurse[]>(`/nurses?shiftId=${shiftId}`),
        ])
        if (!alive) return
        setOnRoster(nurses.some((n) => n.id === userId))
        const currentRows = current.map(assessmentToRow)
        setRows(currentRows)

        const prevShift = findPreviousShift(shifts, shiftId)
        if (prevShift) {
          const prev = await apiGet<BurdenAssessment[]>(
            `/burden-assessments?shiftId=${prevShift.id}&scope=mine`,
            { userId },
          )
          if (!alive) return
          const admissionIds = new Set(currentRows.map((r) => r.admissionId))
          setPreviousRows(prev.filter((a) => admissionIds.has(a.admissionId)).map(assessmentToRow))
          setPreviousLabel(prevShift.label)
        }
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : '讀取麻煩度評估失敗')
      } finally {
        if (alive) setLoading(false)
      }
    }

    void load()
    return () => {
      alive = false
    }
  }, [shiftId, userId, shifts])

  const incompleteByAdmission = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const row of rows) {
      const fields = getIncompleteFields(row.subjective)
      if (fields.length > 0) map.set(row.admissionId, fields)
    }
    return map
  }, [rows])

  const missingCount = incompleteByAdmission.size

  const incompleteBedLabels = useMemo(
    () =>
      rows
        .filter((r) => incompleteByAdmission.has(r.admissionId))
        .map((r) => r.bedLabel)
        .join('、'),
    [rows, incompleteByAdmission],
  )

  const previousScores = useMemo(() => buildScoresMap(previousRows), [previousRows])

  const handleSubmit = useCallback(async () => {
    if (missingCount > 0) {
      setTab('主觀')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await Promise.all(
        rows.map((row) =>
          apiPatch(
            `/burden-assessments/${row.assessmentId}`,
            { subjective: row.subjective, status: 'submitted' },
            { userId },
          ),
        ),
      )
      setToast({ message: '已送出本班主觀評估', tone: 'ok' })
      const refreshed = await apiGet<BurdenAssessment[]>(
        `/burden-assessments?shiftId=${shiftId}&scope=mine`,
        { userId },
      )
      setRows(refreshed.map(assessmentToRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗')
    } finally {
      setSubmitting(false)
    }
  }, [missingCount, rows, shiftId, userId])

  const selectedShift = useMemo(() => shifts.find((s) => s.id === shiftId) ?? null, [shifts, shiftId])

  if (userLoading || loading) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <Notice text="讀取中..." />
      </div>
    )
  }

  if (userError || error) {
    return (
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <Notice tone="bad" text={userError ?? error ?? '讀取失敗'} />
      </div>
    )
  }

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
            <div className="mt-1 truncate">目前僅顯示：{nurseDisplayName} 分配到的病患</div>
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

      {rows.length === 0 ? (
        <div className="mt-6">
          <Notice text="目前沒有分配到的病患評估資料" />
          <div className="mt-3">
            <EmptyAssignedPatientsNotice
              nurseName={nurseDisplayName}
              shiftLabel={selectedShift?.label}
              onRoster={onRoster}
            />
          </div>
        </div>
      ) : tab === '客觀' ? (
        <div className="mt-6 grid gap-4">
          <div className="-mx-6 px-6">
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((row) => {
                const total = objectiveTotal(row.objective)

                return (
                  <div key={row.admissionId} className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold tracking-tight text-slate-900">
                          {row.bedLabel}{' '}
                          <span className="font-semibold text-slate-700">— {row.diagnosis}</span>
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
                        {OBJECTIVE_LAYOUT.flatMap((sec) => [
                          <div
                            key={`h-${sec.no}`}
                            className="md:col-span-2 flex flex-wrap items-baseline justify-between gap-2 pt-1"
                          >
                            <div className="text-xs font-extrabold text-slate-800">
                              {sec.no}. {sec.compactTitle}
                            </div>
                            {sec.hint ? (
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
                                  {'hint' in r && r.hint ? (
                                    <span className="text-[10px] font-medium text-slate-400">{r.hint}</span>
                                  ) : null}
                                </div>
                              </div>
                              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">
                                {row.objective[r.key] ?? 0}
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
            {previousRows.length === 0 ? (
              <div className="rounded-2xl bg-surface p-5 text-sm font-semibold text-slate-600 ring-1 ring-black/10">
                {!previousLabel
                  ? `此班次（${selectedShift?.label ?? '本班'}）為本週排班的第一個班別，故無上一班的交班評估資料。`
                  : `前一班次（${previousLabel}）沒有指派給您的病患，故無對應的上一班評估資料。`}
              </div>
            ) : (
              previousRows
                .slice(0, Math.ceil(previousRows.length / 2))
                .map((row) => <SubjectivePatientReadonlyCard key={row.admissionId} row={row} />)
            )}
          </div>
          <div className="grid gap-4">
            {previousRows.length > 0
              ? previousRows
                  .slice(Math.ceil(previousRows.length / 2))
                  .map((row) => <SubjectivePatientReadonlyCard key={row.admissionId} row={row} />)
              : null}
          </div>
          <div className="lg:sticky lg:top-6">
            <SubjectiveSummarySingle rows={previousRows} />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] lg:items-start">
          <div className="grid gap-4">
            {rows
              .slice(0, Math.ceil(rows.length / 2))
              .map((row) => (
                <SubjectivePatientCard
                  key={row.admissionId}
                  row={row}
                  incompleteFields={incompleteByAdmission.get(row.admissionId)}
                  onChange={(patch) => {
                    setRows((prev) =>
                      prev.map((x) =>
                        x.admissionId === row.admissionId
                          ? { ...x, subjective: { ...x.subjective, ...patch } }
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
              .map((row) => (
                <SubjectivePatientCard
                  key={row.admissionId}
                  row={row}
                  incompleteFields={incompleteByAdmission.get(row.admissionId)}
                  onChange={(patch) => {
                    setRows((prev) =>
                      prev.map((x) =>
                        x.admissionId === row.admissionId
                          ? { ...x, subjective: { ...x.subjective, ...patch } }
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

      {tab === '主觀' && subjectiveMode === '本班' && rows.length > 0 ? (
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
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? '送出中…' : '送出'}
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

function Notice({ text, tone }: { text: string; tone?: 'bad' }) {
  const cls =
    tone === 'bad'
      ? 'bg-[#ffe8e1] text-[#b3341f] ring-[#f2b3a6]'
      : 'bg-surface text-slate-600 ring-black/10'
  return (
    <div className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${cls}`} role="status">
      {text}
    </div>
  )
}

function statusPill(total: number) {
  if (total >= 22) return { label: '高', cls: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]' }
  if (total >= 14) return { label: '中', cls: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]' }
  return { label: '低', cls: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]' }
}

function SubjectivePatientReadonlyCard({ row }: { row: BurdenFormRow }) {
  const s = row.subjective
  const sTotal = row.subjective ? subjectiveTotal(s) : 0
  const oTotal = objectiveTotal(row.objective)
  const total = sTotal + oTotal
  const status = statusPill(total)

  const yesNo = (v: boolean) => (v ? '是' : '否')
  const level = (v: SubjectiveLevel) => (v === 2 ? '高' : v === 1 ? '中' : '低')
  const rass = s.rassScore

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold tracking-tight text-slate-900">
            {row.bedLabel} <span className="font-semibold text-slate-700">— {row.diagnosis}</span>
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
        <ReadonlyRow label="躁動且有下床風險" value={yesNo(s.agitatedFallRisk)} />
        <ReadonlyRow label="躁動且有拔管風險" value={yesNo(s.agitatedTubeRemovalRisk)} />
        <ReadonlyRow label="引流管" value={yesNo(s.drainageTube)} />
        <ReadonlyRow label="需人工管灌" value={yesNo(s.tubeFeeding)} />
        <ReadonlyRow label="換藥頻繁程度" value={level(s.dressingChangeFrequency)} />
        <ReadonlyRow label="生理狀態監測頻繁程度" value={level(s.vitalMonitoringFrequency)} />
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

function SubjectiveSummarySingle({ rows }: { rows: BurdenFormRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
      <div className="bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-slate-600">上一班病患分數摘要（唯讀）</div>
        <div className="mt-1 text-[10px] font-medium text-slate-500">上班查看用，不需填寫</div>
      </div>
      <div className="divide-y divide-black/10">
        {rows.map((row) => {
          const s = row.subjective ? subjectiveTotal(row.subjective) : 0
          const o = objectiveTotal(row.objective)
          const total = s + o
          const status = statusPill(total)
          return (
            <div key={row.admissionId} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">{row.bedLabel}</div>
                <div className="mt-0.5 truncate text-xs text-slate-600">{row.diagnosis}</div>
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
  row,
  incompleteFields,
  onChange,
}: {
  row: BurdenFormRow
  incompleteFields?: string[]
  onChange: (patch: Partial<SubjectivePayload>) => void
}) {
  const s = row.subjective
  const sTotal = subjectiveTotal(s)
  const oTotal = objectiveTotal(row.objective)
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
            {row.bedLabel} <span className="font-semibold text-slate-700">— {row.diagnosis}</span>
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
            value={s.rassScore}
            onChange={(v) => onChange({ rassScore: v })}
            ariaLabel={`${row.bedLabel} RASS 鎮靜分數（原始數值）`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="躁動且有下床風險">
          <YesNoPicker
            value={s.agitatedFallRisk}
            onChange={(v) => onChange({ agitatedFallRisk: v })}
            ariaLabel={`${row.bedLabel} 躁動且有下床風險`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="躁動且有拔管風險">
          <YesNoPicker
            value={s.agitatedTubeRemovalRisk}
            onChange={(v) => onChange({ agitatedTubeRemovalRisk: v })}
            ariaLabel={`${row.bedLabel} 躁動且有拔管風險`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="引流管">
          <YesNoPicker
            value={s.drainageTube}
            onChange={(v) => onChange({ drainageTube: v })}
            ariaLabel={`${row.bedLabel} 引流管`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="需人工管灌">
          <YesNoPicker
            value={s.tubeFeeding}
            onChange={(v) => onChange({ tubeFeeding: v })}
            ariaLabel={`${row.bedLabel} 需人工管灌`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="換藥頻繁程度">
          <LevelPicker
            value={s.dressingChangeFrequency}
            onChange={(lvl) => onChange({ dressingChangeFrequency: lvl })}
            ariaLabel={`${row.bedLabel} 換藥頻繁程度`}
          />
        </SubjectiveRow>

        <SubjectiveRow label="生理狀態監測頻繁程度">
          <LevelPicker
            value={s.vitalMonitoringFrequency}
            onChange={(lvl) => onChange({ vitalMonitoringFrequency: lvl })}
            ariaLabel={`${row.bedLabel} 生理狀態監測頻繁程度`}
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
  rows: BurdenFormRow[]
  previousScores: Partial<Record<string, BedScore>>
  previousLabel: string | null
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/10">
      <div className="bg-surface px-4 py-3">
        <div className="text-xs font-semibold text-slate-600">本班病患分數摘要</div>
        {previousLabel && Object.keys(previousScores).length > 0 ? (
          <div className="mt-1 text-[10px] font-medium text-slate-500">對照：{previousLabel}</div>
        ) : (
          <div className="mt-1 text-[10px] font-medium text-slate-400">尚無歷史紀錄可對照</div>
        )}
      </div>
      <div className="divide-y divide-black/10">
        {rows.map((row) => {
          const sTotal = subjectiveTotal(row.subjective)
          const oTotal = objectiveTotal(row.objective)
          const total = sTotal + oTotal
          const status = statusPill(total)
          const prev = previousScores[row.admissionId]
          const prevStatus = prev ? statusPill(prev.total) : null
          return (
            <div key={row.admissionId} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{row.bedLabel}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-600">{row.diagnosis}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                  {status.label}
                </span>
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
                  <div className="text-center font-semibold tabular-nums text-slate-800">
                    {prev ? prev.subjective : '—'}
                  </div>
                  <div className="text-center font-semibold tabular-nums text-slate-800">
                    {prev ? prev.objective : '—'}
                  </div>
                  <div className="text-center font-semibold tabular-nums text-slate-800">{prev ? prev.total : '—'}</div>
                  <div className="text-center">
                    {prevStatus ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${prevStatus.cls}`}
                      >
                        {prevStatus.label}
                      </span>
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
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}>
                      {status.label}
                    </span>
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
      <BinaryButton variant="yes" active={value === true} onClick={() => onChange(true)} ariaLabel={`${ariaLabel} 是`}>
        是
      </BinaryButton>
      <BinaryButton variant="no" active={value === false} onClick={() => onChange(false)} ariaLabel={`${ariaLabel} 否`}>
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
      <SquareToneButton tone="low" active={value === 0} onClick={() => onChange(0)} ariaLabel={`${ariaLabel} 低`}>
        低
      </SquareToneButton>
      <SquareToneButton tone="mid" active={value === 1} onClick={() => onChange(1)} ariaLabel={`${ariaLabel} 中`}>
        中
      </SquareToneButton>
      <SquareToneButton tone="high" active={value === 2} onClick={() => onChange(2)} ariaLabel={`${ariaLabel} 高`}>
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
