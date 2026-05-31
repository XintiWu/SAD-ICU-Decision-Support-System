import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AllocationPatientHoverDetail } from './AllocationPatientHoverDetail'
import type { PatientDragDetail } from './allocationUtils'

type Props = {
  patient: PatientDragDetail
  children: ReactNode
  disabled?: boolean
}

export function AllocationPatientHoverHost({ patient, children, disabled }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ left: rect.left, top: rect.bottom + 8 })
  }, [])

  function handleEnter() {
    if (disabled) return
    updatePosition()
    setOpen(true)
  }

  function handleLeave() {
    setOpen(false)
  }

  return (
    <div
      ref={anchorRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {open && pos && !disabled
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[100]"
              style={{ left: pos.left, top: pos.top }}
              role="tooltip"
            >
              <AllocationPatientHoverDetail patient={patient} className="!static !mt-0 shadow-xl" />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
