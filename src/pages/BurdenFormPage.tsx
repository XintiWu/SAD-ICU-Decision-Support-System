import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CURRENT_SHIFT_ID,
  apiGet,
  apiPatch,
  defaultSubjective,
  type BurdenAssessment,
  type SubjectivePayload,
} from '../api/client'

const subjectiveRows: Array<{ key: keyof SubjectivePayload; label: string; type: 'number' | 'boolean' | 'level' }> = [
  { key: 'rassScore', label: 'RASS 鎮靜分數（原始數值）', type: 'number' },
  { key: 'agitatedFallRisk', label: '躁動且有下床風險', type: 'boolean' },
  { key: 'agitatedTubeRemovalRisk', label: '躁動且有拔管風險', type: 'boolean' },
  { key: 'drainageTube', label: '引流管', type: 'boolean' },
  { key: 'tubeFeeding', label: '需人工管灌', type: 'boolean' },
  { key: 'dressingChangeFrequency', label: '換藥頻繁程度', type: 'level' },
  { key: 'vitalMonitoringFrequency', label: '生理狀態監測頻繁程度', type: 'level' },
]

export function BurdenFormPage() {
  const [tab, setTab] = useState<'客觀' | '主觀'>('主觀')
  const [rows, setRows] = useState<BurdenAssessment[]>([])
  const [message, setMessage] = useState('讀取中...')

  const refresh = useCallback(() => {
    apiGet<BurdenAssessment[]>(`/burden-assessments?shiftId=${CURRENT_SHIFT_ID}&scope=mine`)
      .then((data) => {
        setRows(data)
        setMessage('')
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : '讀取失敗'))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const missingCount = useMemo(() => rows.filter((row) => row.status !== 'submitted').length, [rows])

  async function save(status: 'draft' | 'submitted') {
    setMessage(status === 'submitted' ? '送出中...' : '儲存草稿中...')
    try {
      const updated = await Promise.all(
        rows.map((row) =>
          apiPatch<BurdenAssessment>(`/burden-assessments/${row.assessmentId}`, {
            subjective: row.subjective ?? defaultSubjective(),
            status,
          }),
        ),
      )
      setRows(updated)
      setMessage(status === 'submitted' ? '已送出' : '草稿已儲存')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '儲存失敗')
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-semibold text-slate-900">麻煩程度評估</div>
          <div className="inline-flex overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-black/15">
            <TabButton active={tab === '客觀'} onClick={() => setTab('客觀')}>客觀（系統）</TabButton>
            <TabButton active={tab === '主觀'} onClick={() => setTab('主觀')}>主觀（自填）</TabButton>
          </div>
        </div>
        <button type="button" onClick={() => save('submitted')} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90">儲存</button>
      </div>

      {message ? <div className="mt-4 rounded-2xl bg-[#fafaf8] p-3 text-sm text-slate-700 ring-1 ring-black/5">{message}</div> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <section key={row.assessmentId} className="rounded-2xl bg-white p-5 ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{row.bedLabel} <span className="font-semibold text-slate-700">— {row.diagnosis}</span></div>
                <div className="mt-1 text-xs text-slate-600">總分 {row.score.totalScore}，等級 {row.score.level}</div>
              </div>
              <span className="rounded-full bg-[#fafaf8] px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-black/10">{row.status === 'submitted' ? '已送出' : '草稿'}</span>
            </div>

            {tab === '客觀' ? (
              <div className="mt-4 grid gap-2">
                {Object.entries(row.objective).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl bg-[#fafaf8] px-3 py-2 text-sm ring-1 ring-black/5">
                    <span className="text-slate-700">{key}</span>
                    <span className="font-extrabold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {subjectiveRows.map((field) => (
                  <SubjectiveControl
                    key={field.key}
                    field={field}
                    value={(row.subjective ?? defaultSubjective())[field.key]}
                    onChange={(value) =>
                      setRows((prev) =>
                        prev.map((item) =>
                          item.assessmentId === row.assessmentId
                            ? { ...item, subjective: { ...(item.subjective ?? defaultSubjective()), [field.key]: value } }
                            : item,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">{missingCount > 0 ? `${missingCount} 位病患尚未送出` : '已完成全部送出'}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => save('draft')} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5">儲存草稿</button>
          <button type="button" onClick={() => save('submitted')} className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90">送出</button>
        </div>
      </div>
    </div>
  )
}

function SubjectiveControl({
  field,
  value,
  onChange,
}: {
  field: (typeof subjectiveRows)[number]
  value: string | number | boolean | null
  onChange: (value: number | boolean | null) => void
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[190px_1fr] sm:items-center">
      <div className="text-xs font-semibold text-slate-700">{field.label}</div>
      {field.type === 'number' ? (
        <input
          className="w-28 rounded-xl bg-white px-3 py-2 text-sm font-semibold ring-1 ring-black/10"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value.trim() === '' ? null : Number(e.target.value))}
        />
      ) : field.type === 'boolean' ? (
        <div className="flex gap-2">
          <Choice active={value === true} onClick={() => onChange(true)}>是</Choice>
          <Choice active={value === false} onClick={() => onChange(false)}>否</Choice>
        </div>
      ) : (
        <div className="flex gap-2">
          <Choice active={value === 0} onClick={() => onChange(0)}>低</Choice>
          <Choice active={value === 1} onClick={() => onChange(1)}>中</Choice>
          <Choice active={value === 2} onClick={() => onChange(2)}>高</Choice>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${active ? 'bg-black text-white' : 'text-slate-700 hover:bg-black/5'}`}>{children}</button>
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 ${active ? 'bg-black text-white ring-black' : 'bg-white text-slate-700 ring-black/10 hover:bg-black/5'}`}>{children}</button>
}
