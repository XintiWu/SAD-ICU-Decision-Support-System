import type { ReactNode } from 'react'
import type { CatalogEntry } from './allocationApiState'
import { AllocationCatalogContext } from './allocationCatalogContext'

export function AllocationCatalogProvider({
  catalog,
  children,
}: {
  catalog: Map<string, CatalogEntry>
  children: ReactNode
}) {
  const value = {
    catalog,
    getBed: (admissionId: string) => catalog.get(admissionId) ?? null,
  }
  return <AllocationCatalogContext.Provider value={value}>{children}</AllocationCatalogContext.Provider>
}
