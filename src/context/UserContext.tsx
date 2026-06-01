import { useEffect, useState, type ReactNode } from 'react'
import { apiGet, CURRENT_NURSE_USER_ID, type ApiUser, type ApiNurse } from '../api/client'
import { UserContext } from './userContextShared'

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(() => {
    return localStorage.getItem('appUserId') || CURRENT_NURSE_USER_ID
  })
  const [user, setUser] = useState<ApiUser | null>(null)
  const [nurses, setNurses] = useState<ApiNurse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingNurses, setLoadingNurses] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setUserId = (id: string) => {
    localStorage.setItem('appUserId', id)
    setUserIdState(id)
  }

  // Fetch all active nurses
  useEffect(() => {
    let alive = true
    apiGet<ApiNurse[]>('/nurses')
      .then((data) => {
        if (!alive) return
        setNurses(data)
      })
      .catch((err) => {
        console.error('Failed to load nurses:', err)
      })
      .finally(() => {
        if (alive) setLoadingNurses(false)
      })
    return () => {
      alive = false
    }
  }, [])

  // Fetch user profile when userId changes
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

  return (
    <UserContext.Provider
      value={{
        user,
        userId,
        setUserId,
        nurses,
        loadingNurses,
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
