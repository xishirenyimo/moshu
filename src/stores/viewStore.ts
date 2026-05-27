import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ViewMode = 'grid' | 'list'

type ViewState = {
  mode: ViewMode
  setMode: (mode: ViewMode) => void
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      mode: 'grid',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'view-preference' }
  )
)
