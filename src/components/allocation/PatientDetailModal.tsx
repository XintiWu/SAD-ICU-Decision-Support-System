import { createPortal } from 'react-dom'
import type { PatientDragDetail } from './allocationUtils'

const scorePillClass = {
  high: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]',
  mid: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
  low: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
} as const

type Props = {
  patient: PatientDragDetail
  onClose: () => void
}

function hasBurdenSection(patient: PatientDragDetail) {
  return (
    (patient.burdenLines?.length ?? 0) > 0 ||
    patient.objectiveTotal != null ||
    patient.subjectiveTotal != null
  )
}

export function PatientDetailModal({ patient, onClose }: Props) {
  const showBurden = hasBurdenSection(patient)

  return createPortal(
    <div
      className="fixed inset-0 z-[150] grid place-items-center p-4 bg-slate-950/50 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Modal Dialog Box */}
      <div
        className="relative z-10 w-full max-w-[380px] rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10 border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking dialog itself
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">病患詳細資訊</div>
            <h3 className="mt-1 text-xl font-black text-slate-900 leading-tight">
              {patient.bedLabel} · {patient.patientName}
            </h3>
            <p className="mt-1 text-xs font-semibold leading-normal text-slate-500 break-words">
              {patient.diagnosis}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Score & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-slate-100 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${scorePillClass[patient.tone]}`}>
              照顧負擔 {patient.score} 分
            </span>
          </div>
          {patient.badges.length ? (
            <div className="flex flex-wrap gap-1">
              {patient.badges.map((b) => (
                <span
                  key={b}
                  className={[
                    'rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                    b === 'STAT' ? 'bg-red-100 text-red-800 ring-1 ring-red-200' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
                  ].join(' ')}
                >
                  {b}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* Patient Demographics & Clinic Info */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-[13px]">
            <DetailItem label="性別" value={patient.sex} />
            <DetailItem label="年齡" value={`${patient.age} 歲`} />
            <DetailItem label="主治醫師" value={patient.attendingPhysician} />
            <DetailItem label="入院日期" value={patient.admittedAt} />
          </dl>
        </div>

        {/* Burden Details */}
        {showBurden ? (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold tracking-wide text-slate-800">照顧負擔評估細項</div>
            {patient.objectiveTotal != null || patient.subjectiveTotal != null ? (
              <div className="text-xs font-bold text-slate-500">
                客觀評估 {patient.objectiveTotal ?? 0} 分 · 主觀評估 {patient.subjectiveTotal ?? 0} 分
              </div>
            ) : null}
            {patient.burdenLines?.length ? (
              <ul className="mt-1.5 grid gap-y-2 max-h-[180px] overflow-y-auto pr-1">
                {patient.burdenLines.map((line) => (
                  <li key={line.label} className="flex items-baseline justify-between gap-3 text-xs border-b border-dashed border-slate-100 pb-1.5">
                    <span className="text-slate-500 font-medium">{line.label}</span>
                    <span className="font-bold text-slate-800 shrink-0">
                      {line.points != null ? `${line.points} 分` : line.value}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
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
      <dt className="text-[11px] font-bold text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  )
}
