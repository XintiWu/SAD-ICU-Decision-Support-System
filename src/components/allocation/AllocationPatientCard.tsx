import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { EnrichedBed } from './allocationUtils'

const railClass = {
  high: 'bg-[#c64a2c]',
  mid: 'bg-[#d88b2c]',
  low: 'bg-[#2f7a44]',
} as const

const pillClass = {
  high: 'bg-[#ffe8e1] text-[#b3341f] ring-1 ring-[#f2b3a6]',
  mid: 'bg-[#fff7ed] text-[#9a5b1a] ring-1 ring-[#f1d7b8]',
  low: 'bg-[#eaf7ee] text-[#1e6c3a] ring-1 ring-[#b7e0c5]',
} as const

type Props = {
  bed: EnrichedBed
  dragging?: boolean
  overlay?: boolean
  onQuickAssign?: () => void
}

export function AllocationPatientCard({ bed, dragging, overlay, onQuickAssign }: Props) {
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

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={[
        'group relative flex w-full cursor-grab items-start justify-between gap-2 rounded-xl bg-white p-2.5 ring-1 ring-black/5 active:cursor-grabbing',
        isDragging || dragging ? 'opacity-40' : 'hover:ring-black/15',
        overlay ? 'cursor-grabbing shadow-lg ring-2 ring-black/20' : '',
      ].join(' ')}
      {...(overlay ? {} : { ...attributes, ...listeners })}
    >
      <span className={`absolute bottom-2 left-0 top-2 w-1 rounded-full ${railClass[bed.tone]}`} aria-hidden />
      <div className="min-w-0 flex-1 pl-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-bold text-slate-900">{bed.bedLabel}</div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${pillClass[bed.tone]}`}>
            {bed.score}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-slate-600">{bed.diagnosis}</div>
        {bed.badges.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {bed.badges.map((b) => (
              <span
                key={b}
                className={[
                  'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  b === 'STAT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600',
                ].join(' ')}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {onQuickAssign && !overlay ? (
        <button
          type="button"
          className="absolute right-1 top-1 hidden rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 ring-1 ring-black/10 group-hover:block"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onQuickAssign()
          }}
        >
          指派
        </button>
      ) : null}
    </div>
  )
}
