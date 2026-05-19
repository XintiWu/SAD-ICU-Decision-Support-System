import type { PatientDragDetail } from './allocationUtils'

const scorePillClass = {
  high: 'bg-red-500/25 text-red-200 ring-1 ring-red-400/40',
  mid: 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40',
  low: 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/40',
} as const

type Props = {
  patient: PatientDragDetail
}

export function AllocationDragPatientPanel({ patient }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 lg:left-8 lg:right-[calc(300px+2.5rem)]"
      role="region"
      aria-label="拖曳中病患詳細資訊"
    >
      <div className="rounded-2xl bg-[#1a1f2e]/96 px-3 py-2 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-tight">
              <span className="shrink-0 text-[10px] font-medium text-white/55">拖曳中</span>
              <Sep />
              <span className="shrink-0 font-bold text-white">{patient.bedShort}</span>
              <span className="shrink-0 font-bold text-white">{patient.patientName}</span>
              {patient.badges.map((b) => (
                <span
                  key={b}
                  className={[
                    'shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase',
                    b === 'STAT' ? 'bg-red-500/30 text-red-200' : 'bg-white/12 text-white/90',
                  ].join(' ')}
                >
                  {b}
                </span>
              ))}
              <Sep />
              <span className="min-w-0 truncate font-medium text-white/80">{patient.diagnosis}</span>
              <Sep />
              <Meta label="性別" value={patient.sex} />
              <Meta label="年齡" value={`${patient.age}歲`} />
              <Meta label="主治" value={patient.attendingPhysician} />
              <Meta label="入院" value={patient.admittedAt} />
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${scorePillClass[patient.tone]}`}
          >
            {patient.score}分
          </span>
        </div>
      </div>
    </div>
  )
}

function Sep() {
  return <span className="shrink-0 text-white/25" aria-hidden>·</span>
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 max-w-full shrink items-baseline gap-1" title={`${label} ${value}`}>
      <span className="shrink-0 text-[10px] text-white/45">{label}</span>
      <span className="truncate font-semibold text-white/90">{value}</span>
    </span>
  )
}
