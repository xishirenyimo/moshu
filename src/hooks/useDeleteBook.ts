import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete } from '@/lib/api'
import { toast } from 'sonner'

export function useDeleteBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDelete('books', new URLSearchParams({ id: `eq.${id}` }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('书籍已删除')
    },
    onError: () => {
      toast.error('删除失败，请重试')
    },
  })
}
