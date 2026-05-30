import { createContext, useContext, type ReactNode } from 'react'
import type { CatalogEntry } from './allocationApiState'

type AllocationCatalogContextValue = {
  catalog: Map<string, CatalogEntry>
  getBed: (admissionId: string) => CatalogEntry | null
}

const AllocationCatalogContext = createContext<AllocationCatalogContextValue | null>(null)

export function AllocationCatalogProvider({
  catalog,
  children,
}: {
  catalog: Map<string, CatalogEntry>
  children: ReactNode
}) {
  const value: AllocationCatalogContextValue = {
    catalog,
    getBed: (admissionId) => catalog.get(admissionId) ?? null,
  }
  return <AllocationCatalogContext.Provider value={value}>{children}</AllocationCatalogContext.Provider>
}

export function useAllocationCatalog() {
  const ctx = useContext(AllocationCatalogContext)
  if (!ctx) throw new Error('useAllocationCatalog must be used within AllocationCatalogProvider')
  return ctx
}

export function useOptionalAllocationCatalog() {
  return useContext(AllocationCatalogContext)
}
