import React, { useState, type ReactElement } from 'react'
import { PatientDetailModal } from './PatientDetailModal'
import { useOptionalAllocationCatalog } from './useAllocationCatalog'

type Props = {
  patientId: string
  children: ReactElement<{ onClick?: (e: React.MouseEvent) => void; style?: React.CSSProperties }>
  disabled?: boolean
}

export function AllocationPatientHoverHost({ patientId, children, disabled }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const catalogCtx = useOptionalAllocationCatalog()
  const patient = catalogCtx?.getBed(patientId) ?? null

  if (disabled || !patient) {
    return children
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setModalOpen(true)
  }

  return (
    <>
      {React.cloneElement(children, {
        onClick: (e: React.MouseEvent) => {
          children.props.onClick?.(e)
          handleClick(e)
        },
        style: {
          ...children.props.style,
          cursor: 'pointer',
        },
      })}
      {modalOpen && (
        <PatientDetailModal patient={patient} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}



