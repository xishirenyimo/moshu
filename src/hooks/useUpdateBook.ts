import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import type { Book } from '@/types/app'

type UpdateBookInput = {
  id: string
  title?: string
  isbn?: string | null
  authorName?: string
  authorNationality?: string | null
  publisher?: string
  language?: string
  total_pages?: number | null
  current_page?: number | null
  reading_status?: string
  purchase_status?: string
  note_status?: string
  notes?: string
  review?: string
  rating?: number | null
  cover_path?: string | null
  completed_at?: string | null
  tagNames?: string[]
}

export function useUpdateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateBookInput): Promise<Book> => {
      const { id, tagNames, authorName, authorNationality, ...rest } = input
      const updates: Record<string, unknown> = { ...rest }
      const userId = useAuthStore.getState().user?.id

      if (authorName !== undefined) {
        if (authorName.trim()) {
          const existingList = await apiGet('authors', new URLSearchParams({
            select: 'id',
            name: `eq.${authorName.trim()}`,
          }))
          const existing = Array.isArray(existingList) ? existingList[0] : null

          if (existing) {
            updates.author_id = existing.id
            if (authorNationality !== undefined) {
              await apiPatch('authors', { nationality: authorNationality ?? null }, new URLSearchParams({ id: `eq.${existing.id}` }))
            }
          } else {
            if (!userId) throw new Error('未登录')
            const createdList = await apiPost('authors', {
              name: authorName.trim(),
              nationality: authorNationality ?? null,
              user_id: userId,
            }, new URLSearchParams({ select: 'id' }))

            const created = Array.isArray(createdList) ? createdList[0] : createdList
            if (!created) throw new Error('创建作者失败')
            updates.author_id = created.id
          }
        } else {
          updates.author_id = null
        }
      }

      const bookList = await apiPatch('books', updates, new URLSearchParams({ id: `eq.${id}`, select: '*' }))
      const data = Array.isArray(bookList) ? bookList[0] : bookList
      if (!data) throw new Error('更新书籍失败')

      if (tagNames !== undefined) {
        await apiDelete('book_tags', new URLSearchParams({ book_id: `eq.${id}` }))

        for (const name of tagNames) {
          if (!name.trim()) continue
          const trimmed = name.trim()

          const existingList = await apiGet('tags', new URLSearchParams({
            select: 'id',
            name: `eq.${trimmed}`,
          }))
          const existing = Array.isArray(existingList) ? existingList[0] : null

          let tagId: string
          if (existing) {
            tagId = existing.id
          } else {
            if (!userId) throw new Error('未登录')
            const createdList = await apiPost('tags', { name: trimmed, user_id: userId }, new URLSearchParams({ select: 'id' }))
            const created = Array.isArray(createdList) ? createdList[0] : createdList
            if (!created) throw new Error('创建标签失败')
            tagId = created.id
          }

          await apiPost('book_tags', { book_id: id, tag_id: tagId })
        }
      }

      return data as Book
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['book', variables.id] })
      toast.success('已保存')
    },
    onError: (error) => {
      console.error('更新书籍失败:', error)
      toast.error(error instanceof Error ? error.message : '保存失败，请重试')
    },
  })
}
