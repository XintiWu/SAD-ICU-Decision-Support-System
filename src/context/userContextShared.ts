import { createContext } from 'react'
import type { ApiUser } from '../api/client'

export type UserContextValue = {
  user: ApiUser | null
  userId: string
  loading: boolean
  error: string | null
}

export const UserContext = createContext<UserContextValue | null>(null)
