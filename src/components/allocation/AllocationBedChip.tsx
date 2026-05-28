import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import { AllocationPatientHoverHost } from './AllocationPatientHoverHost'
import type { EnrichedBed } from './allocationUtils'

function primaryDiagnosis(text: string) {
  return text.split(',')[0]?.trim() || text
}


const railClass = {
  high: 'bg-[#e85d4a]',
  mid: 'bg-[#e8a43a]',
  low: 'bg-[#3d9b5f]',
} as const

const chipBg = {
  high: 'bg-[#fff8f6]',
  mid: 'bg-[#fffbf5]',
  low: 'bg-[#f6fbf7]',
} as const

type Props = {
  bed: EnrichedBed
  dragging?: boolean
  overlay?: boolean
  fill?: boolean
}

export function AllocationBedChip({ bed, dragging, overlay, fill }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bed.id,
    disabled: overlay,
  })

  const style: CSSProperties = overlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  const chip = (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={[
        'group relative flex cursor-grab flex-col overflow-visible rounded-lg ring-1 ring-black/8 active:cursor-grabbing',
        fill ? 'w-full' : 'w-[108px] shrink-0',
        chipBg[bed.tone],
        isDragging || dragging ? 'pointer-events-none opacity-35' : 'hover:ring-black/15 hover:shadow-sm',
        overlay ? 'w-[116px] cursor-grabbing shadow-md ring-2 ring-black/15' : '',
      ].join(' ')}
      {...(overlay ? {} : { ...attributes, ...listeners })}
    >
      <span className={`h-1 w-full shrink-0 ${railClass[bed.tone]}`} aria-hidden />
      <div className="flex min-w-0 flex-col gap-1 px-1.5 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span
            className="shrink-0 rounded bg-white/80 px-1 py-px text-[9px] font-bold text-slate-700 ring-1 ring-black/10"
            title={`麻煩度分數：${bed.score}`}
          >
            麻煩度 {bed.score}
          </span>
          {bed.badges.includes('STAT') ? (
            <span className="shrink-0 rounded bg-red-100 px-1 py-px text-[9px] font-bold text-red-700">STAT</span>
          ) : null}
          {bed.badges
            .filter((b) => b !== 'STAT')
            .map((b) => (
              <span
                key={b}
                className="shrink-0 rounded bg-white/70 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-black/8"
              >
                {b}
              </span>
            ))}
        </div>
        <div className="text-[12px] font-bold leading-none text-slate-900">{bed.bedShort}</div>
        <div className="text-[10px] font-medium leading-snug text-slate-600 break-words">{primaryDiagnosis(bed.diagnosis)}</div>
      </div>
    </div>
  )

  if (overlay) return chip

  return (
    <AllocationPatientHoverHost patientId={bed.id} disabled={isDragging || dragging}>
      {chip}
    </AllocationPatientHoverHost>
  )
}
