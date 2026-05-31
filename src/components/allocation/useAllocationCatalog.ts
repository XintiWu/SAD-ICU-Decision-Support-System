import { useContext } from 'react'
import { AllocationCatalogContext } from './allocationCatalogContext'

export function useAllocationCatalog() {
  const ctx = useContext(AllocationCatalogContext)
  if (!ctx) throw new Error('useAllocationCatalog must be used within AllocationCatalogProvider')
  return ctx
}

export function useOptionalAllocationCatalog() {
  return useContext(AllocationCatalogContext)
}
