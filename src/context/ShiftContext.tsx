import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiGet, CURRENT_SHIFT_ID, type ApiShift } from '../api/client'

const STORAGE_KEY = 'icu-selected-shift-id'

type ShiftContextValue = {
  shifts: ApiShift[]
  shiftId: string
  selectedShift: ApiShift | null
  setShiftId: (id: string) => void
  loading: boolean
  error: string | null
}

const ShiftContext = createContext<ShiftContextValue | null>(null)

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<ApiShift[]>([])
  const [shiftId, setShiftIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return CURRENT_SHIFT_ID
    return localStorage.getItem(STORAGE_KEY) ?? CURRENT_SHIFT_ID
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    Promise.all([apiGet<ApiShift[]>('/shifts'), apiGet<ApiShift>('/shifts/current')])
      .then(([list, current]) => {
        if (!alive) return
        setShifts(list)
        const stored = localStorage.getItem(STORAGE_KEY)
        const nextId =
          stored && list.some((s) => s.id === stored)
            ? stored
            : (current?.id ?? list[0]?.id ?? CURRENT_SHIFT_ID)
        setShiftIdState(nextId)
        localStorage.setItem(STORAGE_KEY, nextId)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!alive) return
        const message = err instanceof Error ? err.message : '載入班別失敗'
        setError(message)
        setShifts([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const setShiftId = useCallback((id: string) => {
    setShiftIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const selectedShift = useMemo(
    () => shifts.find((s) => s.id === shiftId) ?? shifts[0] ?? null,
    [shifts, shiftId],
  )

  const value = useMemo(
    () => ({ shifts, shiftId, selectedShift, setShiftId, loading, error }),
    [shifts, shiftId, selectedShift, setShiftId, loading, error],
  )

  return <ShiftContext.Provider value={value}>{children}</ShiftContext.Provider>
}

export function useShift() {
  const ctx = useContext(ShiftContext)
  if (!ctx) throw new Error('useShift must be used within ShiftProvider')
  return ctx
}

export function shiftStatusLabel(status: string) {
  if (status === 'confirmed') return '已確認'
  if (status === 'open') return '進行中'
  if (status === 'allocating') return '分配中'
  if (status === 'closed') return '已結束'
  return status
}
