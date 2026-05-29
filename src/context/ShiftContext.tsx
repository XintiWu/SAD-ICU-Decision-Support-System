import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { CURRENT_SHIFT_ID, apiGet } from '../api/client'

type CurrentShift = {
  shiftId?: string
  id?: string
}

type ShiftContextValue = {
  shiftId: string
  loading: boolean
  error: string | null
}

const ShiftContext = createContext<ShiftContextValue>({
  shiftId: CURRENT_SHIFT_ID,
  loading: true,
  error: null,
})

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shiftId, setShiftId] = useState(CURRENT_SHIFT_ID)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    apiGet<CurrentShift>('/shifts/current')
      .then((data) => {
        if (!alive) return
        setShiftId(data.shiftId ?? data.id ?? CURRENT_SHIFT_ID)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : '讀取目前班別失敗')
        setShiftId(CURRENT_SHIFT_ID)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  return (
    <ShiftContext.Provider value={{ shiftId, loading, error }}>
      {children}
    </ShiftContext.Provider>
  )
}

export function useShift() {
  return useContext(ShiftContext)
}