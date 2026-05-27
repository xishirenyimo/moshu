import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete } from '@/lib/api'
import { toast } from 'sonner'

export function useDeleteAuthor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (authorId: string) => {
      await apiDelete('authors', new URLSearchParams({ id: `eq.${authorId}` }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] })
      toast.success('作者已删除')
    },
    onError: (e: Error) => {
      toast.error(e.message || '删除失败')
    },
  })
}
