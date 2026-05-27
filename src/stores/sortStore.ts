import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SortMode = 'updated_at' | 'title' | 'rating'

type SortState = {
  mode: SortMode
  setMode: (mode: SortMode) => void
}

export const useSortStore = create<SortState>()(
  persist(
    (set) => ({
      mode: 'updated_at',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'moshu-sort' },
  ),
)
