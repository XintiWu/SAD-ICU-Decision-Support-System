import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  apiGet,
  CHARGE_USER_ID,
  CURRENT_NURSE_USER_ID,
  type ApiNurse,
  type ApiUser,
} from '../api/client'
import { useShift } from './ShiftContext'

const STORAGE_KEY = 'icu-selected-user-id'

type UserContextValue = {
  user: ApiUser | null
  userId: string
  setUserId: (id: string) => void
  nurseOptions: ApiNurse[]
  loading: boolean
  error: string | null
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const { shiftId } = useShift()
  const [userId, setUserIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return CURRENT_NURSE_USER_ID
    return localStorage.getItem(STORAGE_KEY) ?? CURRENT_NURSE_USER_ID
  })
  const [user, setUser] = useState<ApiUser | null>(null)
  const [nurseOptions, setNurseOptions] = useState<ApiNurse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setUserId = useCallback((id: string) => {
    setUserIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  useEffect(() => {
    let alive = true
    apiGet<ApiNurse[]>(`/nurses?shiftId=${shiftId}`)
      .then((list) => {
        if (!alive) return
        const byId = new Map(list.map((n) => [n.id, n]))
        if (!byId.has(CHARGE_USER_ID)) {
          byId.set(CHARGE_USER_ID, {
            id: CHARGE_USER_ID,
            displayName: '陳O琪',
            shortName: '陳O琪',
            role: 'charge_nurse',
            seniorityLevel: null,
            isActive: true,
          })
        }
        setNurseOptions([...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-Hant')))
      })
      .catch(() => {
        if (!alive) return
        setNurseOptions([])
      })
    return () => {
      alive = false
    }
  }, [shiftId])

  useEffect(() => {
    let alive = true
    setLoading(true)
    apiGet<ApiUser>('/me', { userId })
      .then((data) => {
        if (!alive) return
        setUser(data)
        setError(null)
      })
      .catch((err) => {
        if (!alive) return
        setUser(null)
        setError(err instanceof Error ? err.message : '讀取使用者失敗')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [userId])

  const value = useMemo(
    () => ({
      user,
      userId,
      setUserId,
      nurseOptions,
      loading,
      error,
    }),
    [user, userId, setUserId, nurseOptions, loading, error],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
