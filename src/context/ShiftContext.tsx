import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiGet, CURRENT_SHIFT_ID, type ApiShift } from '../api/client'
import { SHIFT_STORAGE_KEY, ShiftContext } from './shiftContextShared'

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shifts, setShifts] = useState<ApiShift[]>([])
  const [shiftId, setShiftIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return CURRENT_SHIFT_ID
    return localStorage.getItem(SHIFT_STORAGE_KEY) ?? CURRENT_SHIFT_ID
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    Promise.all([apiGet<ApiShift[]>('/shifts'), apiGet<ApiShift>('/shifts/current')])
      .then(([list, current]) => {
        if (!alive) return
        setShifts(list)
        const stored = localStorage.getItem(SHIFT_STORAGE_KEY)
        const nextId =
          stored && list.some((s) => s.id === stored)
            ? stored
            : (current?.id ?? list[0]?.id ?? CURRENT_SHIFT_ID)
        setShiftIdState(nextId)
        localStorage.setItem(SHIFT_STORAGE_KEY, nextId)
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
    localStorage.setItem(SHIFT_STORAGE_KEY, id)
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
