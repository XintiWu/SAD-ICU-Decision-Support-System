import { createContext } from 'react'
import type { ApiShift } from '../api/client'

export const SHIFT_STORAGE_KEY = 'icu-selected-shift-id'

export type ShiftContextValue = {
  shifts: ApiShift[]
  shiftId: string
  selectedShift: ApiShift | null
  setShiftId: (id: string) => void
  refreshShifts: () => Promise<void>
  loading: boolean
  error: string | null
}

export const ShiftContext = createContext<ShiftContextValue | null>(null)
