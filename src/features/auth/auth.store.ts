import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IUser } from './auth.types'

interface AuthState {
  token: string | null
  user: IUser | null
  setAuth: (token: string, user: IUser) => void
  logout: () => void
}

// Persisted to localStorage under the key "auth", so a page refresh keeps you logged in.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => {
        set({ token: null, user: null })
        // Hard redirect on purpose: it also wipes the in-memory React Query cache.
        window.location.href = '/login'
      },
    }),
    { name: 'auth' },
  ),
)
