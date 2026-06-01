import { createContext } from 'react'
import type { ApiUser, ApiNurse } from '../api/client'

export type UserContextValue = {
  user: ApiUser | null
  userId: string
  setUserId: (id: string) => void
  nurses: ApiNurse[]
  loadingNurses: boolean
  loading: boolean
  error: string | null
}

export const UserContext = createContext<UserContextValue | null>(null)
