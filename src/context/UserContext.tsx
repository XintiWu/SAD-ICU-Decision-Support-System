import { useEffect, useState, type ReactNode } from 'react'
import { apiGet, CURRENT_NURSE_USER_ID, type ApiUser } from '../api/client'
import { UserContext } from './userContextShared'

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    apiGet<ApiUser>('/me', { userId: CURRENT_NURSE_USER_ID })
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
  }, [])

  return (
    <UserContext.Provider
      value={{
        user,
        userId: CURRENT_NURSE_USER_ID,
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
