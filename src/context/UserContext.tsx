import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet, CURRENT_NURSE_USER_ID, type ApiUser } from '../api/client'

type UserContextValue = {
  user: ApiUser | null
  userId: string
  loading: boolean
  error: string | null
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
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
        userId: user?.id ?? CURRENT_NURSE_USER_ID,
        loading,
        error,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
