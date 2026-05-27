import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPatch } from '@/lib/api'
import { toast } from 'sonner'

export function useUpdateAuthor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; name?: string; nationality?: string | null; bio?: string | null }) => {
      const { id, ...updates } = input
      await apiPatch('authors', updates, new URLSearchParams({ id: `eq.${id}` }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('作者信息已更新')
    },
    onError: (error) => {
      console.error('更新作者失败:', error)
      toast.error(error instanceof Error ? error.message : '更新失败')
    },
  })
}
