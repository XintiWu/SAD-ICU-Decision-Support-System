import { useCallback, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AllocationPatientHoverDetail } from './AllocationPatientHoverDetail'
import { useOptionalAllocationCatalog } from './useAllocationCatalog'

type Props = {
  patientId: string
  children: ReactNode
  disabled?: boolean
}

export function AllocationPatientHoverHost({ patientId, children, disabled }: Props) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [posStyle, setPosStyle] = useState<CSSProperties | null>(null)
  const catalogCtx = useOptionalAllocationCatalog()

  const updatePosition = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    
    const estimatedHeight = 320 // Estimated height of hover card detail
    const spaceBelow = window.innerHeight - rect.bottom

    if (spaceBelow < estimatedHeight && rect.top > spaceBelow) {
      // Place above the card
      setPosStyle({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 8,
      })
    } else {
      // Place below the card
      setPosStyle({
        left: rect.left,
        top: rect.bottom + 8,
      })
    }
  }, [])

  const patient = catalogCtx?.getBed(patientId) ?? null

  function handleEnter() {
    if (disabled || !patient) return
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
      {open && posStyle && patient && !disabled
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[100]"
              style={posStyle}
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

