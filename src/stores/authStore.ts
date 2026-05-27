import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

type AuthState = {
  user: User | null
  displayName: string
  loading: boolean
  setUser: (user: User | null) => void
  setDisplayName: (name: string) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  displayName: '',
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setDisplayName: (displayName) => set({ displayName }),
  setLoading: (loading) => set({ loading }),
}))
