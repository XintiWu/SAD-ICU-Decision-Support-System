import type { PatientDragDetail } from './allocationUtils'

const scorePillClass = {
  high: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]',
  mid: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
  low: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
} as const

type Props = {
  patient: PatientDragDetail
  className?: string
}

function hasBurdenSection(patient: PatientDragDetail) {
  return (
    (patient.burdenLines?.length ?? 0) > 0 ||
    patient.objectiveTotal != null ||
    patient.subjectiveTotal != null
  )
}

export function AllocationPatientHoverDetail({ patient, className = '' }: Props) {
  const showBurden = hasBurdenSection(patient)

  return (
    <div
      role="tooltip"
      className={[
        'pointer-events-none absolute left-0 top-full z-50 mt-1.5 w-[min(340px,calc(100vw-2rem))] rounded-xl bg-white p-3 text-[13px] text-slate-700 shadow-lg ring-1 ring-black/10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
         <div className="min-w-0">
          <div className="text-base font-bold text-slate-900 leading-tight">
            {patient.bedLabel} · {patient.patientName}
          </div>
          <div className="mt-0.5 text-xs font-medium text-slate-500 leading-normal">{patient.diagnosis}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${scorePillClass[patient.tone]}`}>
          麻煩度 {patient.score}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        <DetailItem label="性別" value={patient.sex} />
        <DetailItem label="年齡" value={`${patient.age} 歲`} />
        <DetailItem label="入院" value={patient.admittedAt} className="col-span-2" />
        <DetailItem label="主治醫師" value={patient.attendingPhysician} className="col-span-2" />
      </dl>

      {patient.badges.length ? (
        <div className="mt-2 flex flex-wrap gap-1 border-t border-black/5 pt-1.5">
          {patient.badges.map((b) => (
            <span
              key={b}
              className={[
                'rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                b === 'STAT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600',
              ].join(' ')}
            >
              {b}
            </span>
          ))}
        </div>
      ) : null}

      {showBurden ? (
        <div className="mt-2 border-t border-black/5 pt-2">
          <div className="text-xs font-bold text-slate-900">麻煩度細項</div>
          {patient.objectiveTotal != null || patient.subjectiveTotal != null ? (
            <div className="mt-0.5 text-xs font-semibold text-slate-600">
              客觀 {patient.objectiveTotal ?? 0} · 主觀 {patient.subjectiveTotal ?? 0}
            </div>
          ) : null}
          {patient.burdenLines?.length ? (
            <ul className="mt-1.5 grid gap-y-1">
              {patient.burdenLines.map((line) => (
                <li key={line.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-slate-400">{line.label}</span>
                  <span className="text-xs font-semibold text-slate-800">
                    {line.points != null ? line.points : line.value}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DetailItem({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  )
}
