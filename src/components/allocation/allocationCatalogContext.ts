import { createContext } from 'react'
import type { CatalogEntry } from './allocationApiState'

export type AllocationCatalogContextValue = {
  catalog: Map<string, CatalogEntry>
  getBed: (admissionId: string) => CatalogEntry | null
}

export const AllocationCatalogContext = createContext<AllocationCatalogContextValue | null>(null)
