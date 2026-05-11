import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CURRENT_SHIFT_ID, apiGet, apiPost, apiPut, type AllocationPatient, type AllocationRun } from '../api/client'

export function ChargeAllocationPage() {
  const navigate = useNavigate()
  const [run, setRun] = useState<AllocationRun | null>(null)
  const [message, setMessage] = useState('讀取中...')

  useEffect(() => {
    apiGet<AllocationRun>('/allocation-runs/00000000-0000-0000-0000-000000000901')
      .then((data) => {
        setRun(data)
        setMessage('')
      })
      .catch(() => setMessage('請先產生系統建議分床'))
  }, [])

  const nurses = useMemo(() => run?.byNurse ?? [], [run])
  const loadStats = useMemo(() => {
    const loads = nurses.map((n) => n.load)
    return {
      avg: loads.length ? Math.round((loads.reduce((a, b) => a + b, 0) / loads.length) * 10) / 10 : 0,
      max: loads.length ? Math.max(...loads) : 0,
      maxName: nurses.find((n) => n.load === Math.max(...loads))?.shortName ?? '—',
    }
  }, [nurses])

  async function suggest() {
    setMessage('產生建議中...')
    try {
      const data = await apiPost<AllocationRun>('/allocation-runs/suggest', {
        shiftId: CURRENT_SHIFT_ID,
        targetShiftId: CURRENT_SHIFT_ID,
      })
      setRun(data)
      setMessage('已產生系統建議')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '產生建議失敗')
    }
  }

  async function movePatient(patient: AllocationPatient, nurseId: string) {
    if (!run) return
    const items = run.byNurse.flatMap((n) =>
      n.patients
        .filter((p) => p.admissionId !== patient.admissionId)
        .map((p, index) => ({ admissionId: p.admissionId, nurseId: n.nurseId, sortOrder: index + 1, isManualOverride: p.isManualOverride })),
    )
    items.push({ admissionId: patient.admissionId, nurseId, sortOrder: 999, isManualOverride: true })
    setMessage('更新分配中...')
    try {
      const updated = await apiPut<AllocationRun>(`/allocation-runs/${run.allocationRunId}/items`, { items })
      setRun(updated)
      setMessage('分配已儲存')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '更新分配失敗')
    }
  }

  async function confirm() {
    if (!run) return
    setMessage('確認送出中...')
    try {
      await apiPost<AllocationRun>(`/allocation-runs/${run.allocationRunId}/confirm`, {})
      setMessage('已確認送出')
      navigate('/leader/allocation-result')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '確認失敗')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">分床建議與調整</div>
            <div className="mt-1 text-xs text-slate-600">{message || '分配調整會直接儲存到後端資料庫'}</div>
          </div>
          <button type="button" onClick={suggest} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-black/10 hover:bg-black/5">系統建議分床</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard label="未分配" value={run?.unassigned.length ?? 0} unit="床" />
          <StatCard label="病患" value={run?.stats.totalBeds ?? 0} unit="床" />
          <StatCard label="護理師" value={run?.stats.totalNurses ?? 0} unit="位" />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {nurses.map((nurse) => (
            <section key={nurse.nurseId} className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">{nurse.shortName}</div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-black/10">負荷 {nurse.load}</span>
              </div>
              <div className="mt-3 grid gap-2">
                {nurse.patients.map((patient) => (
                  <div key={patient.admissionId} className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{patient.bedLabel}</div>
                        <div className="mt-0.5 text-xs text-slate-600">{patient.diagnosis}</div>
                      </div>
                      <span className="rounded-full bg-[#fafaf8] px-2 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-black/10">{patient.score}分</span>
                    </div>
                    <select
                      className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-black/10"
                      value={nurse.nurseId}
                      onChange={(e) => movePatient(patient, e.target.value)}
                    >
                      {nurses.map((option) => <option key={option.nurseId} value={option.nurseId}>{option.shortName}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl bg-white p-6 ring-1 ring-black/10 lg:sticky lg:top-24 lg:self-start">
        <div className="text-sm font-semibold text-slate-900">麻煩度負荷概覽</div>
        <div className="mt-4 rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
          <div className="text-xs font-semibold text-slate-800">目前最高負荷</div>
          <div className="mt-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-900">{loadStats.maxName}</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-black/10">{loadStats.max}</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">平均 {loadStats.avg}</div>
        </div>
        <button type="button" onClick={confirm} disabled={!run} className="mt-4 w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-40">確認送出</button>
      </aside>
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="text-2xl font-semibold leading-none text-slate-900">{value}</div>
        <div className="text-sm font-semibold text-slate-700">{unit}</div>
      </div>
    </div>
  )
}
