import { useEffect, useMemo, useState } from 'react'
import { apiGet, type ApiAdmission, type ApiNurse, type BurdenAssessment } from '../api/client'
import { EmptyAssignedPatientsNotice } from '../components/EmptyAssignedPatientsNotice'
import { useChargeNurseId } from '../hooks/useChargeNurseId'
import { formatNurseDisplay } from '../lib/nurseLabel'
import { useShift } from '../context/ShiftContext'
import { useUser } from '../context/UserContext'

type OverviewData = {
  onDutyCharge: { id?: string; shortName: string }
  myPatients: ApiAdmission[]
  allPatients: ApiAdmission[]
}

export function NurseOverviewPage() {
  const { shiftId, selectedShift } = useShift()
  const { userId, user } = useUser()
  const chargeNurseId = useChargeNurseId()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [burdens, setBurdens] = useState<BurdenAssessment[]>([])
  const [onRoster, setOnRoster] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setOverview(null)
    setBurdens([])
    setOnRoster(null)

    const load = () => {
      Promise.all([
        apiGet<OverviewData>(`/nurse/overview?shiftId=${shiftId}`, { userId }),
        apiGet<BurdenAssessment[]>(`/burden-assessments?shiftId=${shiftId}&scope=all`, { userId }),
        apiGet<ApiNurse[]>(`/nurses?shiftId=${shiftId}`),
      ])
        .then(([overviewData, burdenData, nurses]) => {
          if (!alive) return
          setOverview(overviewData)
          setBurdens(burdenData)
          setOnRoster(nurses.some((n) => n.id === userId))
          setError(null)
        })
        .catch((err) => {
          if (!alive) return
          setError(err instanceof Error ? err.message : '讀取資料失敗')
        })
    }

    load()
    const timer = window.setInterval(load, 5000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [shiftId, userId])

  const burdenByAdmission = useMemo(
    () => new Map(burdens.map((b) => [b.admissionId, b])),
    [burdens],
  )

  if (error) return <Notice tone="bad" text={error} />
  if (!overview) return <Notice text="讀取中..." />

  const nurseDisplayName = formatNurseDisplay(user?.shortName ?? '您', {
    nurseId: userId,
    chargeNurseId: chargeNurseId ?? overview.onDutyCharge?.id,
  })

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">整體班別總覽</div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Kpi title="我當班病患" value={`${overview.myPatients.length}`} hint={`本班共有 ${overview.allPatients.length} 位病人`} />
          <Kpi
            title="當班小組長"
            value={formatNurseDisplay(overview.onDutyCharge.shortName, {
              nurseId: overview.onDutyCharge.id,
              chargeNurseId,
              role: 'charge_nurse',
            })}
            hint="負責統籌與支援調度"
            tone="mid"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">我的病患</div>
        <p className="mt-1 text-xs text-slate-600">
          顯示<strong className="font-semibold text-slate-800">分床後分配給 {nurseDisplayName}</strong>的床位
        </p>
        <div className="mt-4">
          {overview.myPatients.length === 0 ? (
            <EmptyAssignedPatientsNotice
              nurseName={nurseDisplayName}
              shiftLabel={selectedShift?.label}
              onRoster={onRoster}
              allPatientCount={overview.allPatients.length}
            />
          ) : (
            <PatientsTable rows={overview.myPatients} burdenByAdmission={burdenByAdmission} />
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/10">
        <div className="text-sm font-semibold text-slate-900">本班全部病患</div>
        <div className="mt-4">
          <PatientsTable rows={overview.allPatients} burdenByAdmission={burdenByAdmission} />
        </div>
      </section>
    </div>
  )
}

function PatientsTable({
  rows,
  burdenByAdmission,
}: {
  rows: ApiAdmission[]
  burdenByAdmission: Map<string, BurdenAssessment>
}) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-black/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#fafaf8] text-xs text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">床號</th>
            <th className="px-4 py-3 font-semibold">診斷</th>
            <th className="px-4 py-3 font-semibold">性別</th>
            <th className="px-4 py-3 font-semibold">年齡</th>
            <th className="px-4 py-3 font-semibold">主治醫師</th>
            <th className="px-4 py-3 font-semibold">負擔總分</th>
            <th className="px-4 py-3 font-semibold">負荷等級</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const burden = burdenByAdmission.get(p.admissionId)
            const level = burden?.score.level ?? '低'
            return (
              <tr key={p.admissionId} className="border-t border-black/10">
                <td className="px-4 py-3 font-semibold text-slate-900">{p.bedLabel}</td>
                <td className="px-4 py-3 text-slate-800">{p.diagnosis}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.sex}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{p.age}</td>
                <td className="px-4 py-3 text-slate-800">{p.attendingPhysician}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{burden?.score.totalScore ?? 0}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelPill(level)}`}>{level}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function levelPill(level: '高' | '中' | '低') {
  if (level === '高') return 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]'
  if (level === '中') return 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]'
  return 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]'
}

function Kpi({ title, value, hint, tone }: { title: string; value: string; hint: string; tone?: 'mid' }) {
  const pill = tone === 'mid' ? 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]' : 'bg-[#f1f5f9] text-[#334155] ring-1 ring-black/10'
  return (
    <div className="rounded-2xl bg-[#fafaf8] p-4 ring-1 ring-black/5">
      <div className="text-xs font-semibold text-slate-600">{title}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill}`}>本班</span>
      </div>
      <div className="mt-2 text-xs text-slate-600">{hint}</div>
    </div>
  )
}

function Notice({ text, tone }: { text: string; tone?: 'bad' }) {
  return <div className={`rounded-2xl bg-white p-6 text-sm ring-1 ${tone === 'bad' ? 'text-[#b3341f] ring-[#f2b3a6]' : 'text-slate-600 ring-black/10'}`}>{text}</div>
}
