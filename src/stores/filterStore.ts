import { create } from 'zustand'

export type ReadingStatus = '' | '未读' | '在读' | '已读' | '弃读'
export type PurchaseStatus = '' | '未购' | '已购'
export type NoteStatus = '' | '未进行' | '进行中' | '已完成'

type FilterState = {
  search: string
  readingStatus: ReadingStatus
  purchaseStatus: PurchaseStatus
  noteStatus: NoteStatus
  tagIds: string[]
  authorIds: string[]
  nationality: string
  setSearch: (search: string) => void
  setReadingStatus: (status: ReadingStatus) => void
  setPurchaseStatus: (status: PurchaseStatus) => void
  setNoteStatus: (status: NoteStatus) => void
  setTagIds: (ids: string[]) => void
  setAuthorIds: (ids: string[]) => void
  setNationality: (nationality: string) => void
  clearAll: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  search: '',
  readingStatus: '',
  purchaseStatus: '',
  noteStatus: '',
  tagIds: [],
  authorIds: [],
  nationality: '',
  setSearch: (search) => set({ search }),
  setReadingStatus: (status) => set({ readingStatus: status }),
  setPurchaseStatus: (status) => set({ purchaseStatus: status }),
  setNoteStatus: (status) => set({ noteStatus: status }),
  setTagIds: (ids) => set({ tagIds: ids }),
  setAuthorIds: (ids) => set({ authorIds: ids }),
  setNationality: (nationality) => set({ nationality }),
  clearAll: () =>
    set({
      search: '',
      readingStatus: '',
      purchaseStatus: '',
      noteStatus: '',
      tagIds: [],
      authorIds: [],
      nationality: '',
    }),
}))
