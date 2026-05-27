import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { toast } from 'sonner'
import type { Excerpt } from '@/types/app'

export function useExcerpts(bookId: string | undefined) {
  return useQuery({
    queryKey: ['excerpts', bookId],
    queryFn: async (): Promise<Excerpt[]> => {
      if (!bookId) return []
      const data = await apiGet('excerpts', new URLSearchParams({
        select: '*',
        book_id: `eq.${bookId}`,
        order: 'created_at.desc',
      }))
      return (Array.isArray(data) ? data : data ? [data] : []) as Excerpt[]
    },
    enabled: !!bookId,
  })
}

export function useCreateExcerpt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { book_id: string; content: string; page?: number | null }) => {
      const data = await apiPost('excerpts', input, new URLSearchParams({ select: '*' }))
      const result = Array.isArray(data) ? data[0] : data
      if (!result) throw new Error('添加摘录失败')
      return result as Excerpt
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['excerpts', data.book_id] })
      toast.success('摘录已添加')
    },
    onError: (error) => {
      console.error('添加摘录失败:', error)
      toast.error(error instanceof Error ? error.message : '添加摘录失败')
    },
  })
}

export function useUpdateExcerpt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; book_id: string; content?: string; page?: number | null }) => {
      const { id, ...updates } = input
      const data = await apiPatch('excerpts', updates, new URLSearchParams({ id: `eq.${id}`, select: '*' }))
      const result = Array.isArray(data) ? data[0] : data
      if (!result) throw new Error('更新摘录失败')
      return result as Excerpt
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['excerpts', data.book_id] })
    },
    onError: (error) => {
      console.error('更新摘录失败:', error)
      toast.error(error instanceof Error ? error.message : '更新摘录失败')
    },
  })
}

export function useDeleteExcerpt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (excerpt: Excerpt) => {
      await apiDelete('excerpts', new URLSearchParams({ id: `eq.${excerpt.id}` }))
      return excerpt
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['excerpts', data.book_id] })
      toast.success('摘录已删除')
    },
    onError: (error) => {
      console.error('删除摘录失败:', error)
      toast.error(error instanceof Error ? error.message : '删除摘录失败')
    },
  })
}
