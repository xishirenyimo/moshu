import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Author } from '@/types/app'

export function useAuthors() {
  return useQuery({
    queryKey: ['authors'],
    queryFn: async (): Promise<Author[]> => {
      const params = new URLSearchParams()
      params.set('select', '*')
      params.set('order', 'name.asc')

      const data = await apiGet('authors', params)
      return (Array.isArray(data) ? data : []) as Author[]
    },
    staleTime: 10 * 60 * 1000,
  })
}
