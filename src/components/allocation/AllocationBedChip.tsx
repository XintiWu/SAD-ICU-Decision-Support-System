import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { EnrichedBed } from './allocationUtils'

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
  onQuickAssign?: () => void
}

export function AllocationBedChip({ bed, dragging, overlay, fill, onQuickAssign }: Props) {
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
        'group relative flex cursor-grab flex-col overflow-hidden rounded-lg ring-1 ring-black/8 active:cursor-grabbing',
        fill ? 'w-full' : 'w-[108px] shrink-0',
        chipBg[bed.tone],
        isDragging || dragging ? 'pointer-events-none opacity-35' : 'hover:ring-black/15 hover:shadow-sm',
        overlay ? 'w-[116px] cursor-grabbing shadow-md ring-2 ring-black/15' : '',
      ].join(' ')}
      {...(overlay ? {} : { ...attributes, ...listeners })}
    >
      <span className={`h-1 w-full ${railClass[bed.tone]}`} aria-hidden />
      <div className="flex min-h-[48px] min-w-0 flex-col justify-center px-1.5 py-1.5">
        <div className="flex min-w-0 items-center justify-between gap-1">
          <span className="truncate text-[12px] font-bold leading-none text-slate-900">{bed.bedShort}</span>
          {bed.badges.includes('STAT') ? (
            <span className="shrink-0 rounded bg-red-100 px-1 py-px text-[9px] font-bold text-red-700">
              STAT
            </span>
          ) : null}
        </div>
        <div className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-slate-600">
          {bed.diagnosis}
        </div>
      </div>
      {onQuickAssign && !overlay ? (
        <button
          type="button"
          className="absolute right-0.5 top-0.5 hidden rounded bg-white/95 px-1 py-px text-[9px] font-semibold text-slate-600 ring-1 ring-black/10 group-hover:block"
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
