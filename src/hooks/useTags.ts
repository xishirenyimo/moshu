import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Tag } from '@/types/app'

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async (): Promise<Tag[]> => {
      const params = new URLSearchParams()
      params.set('select', '*')
      params.set('order', 'name.asc')

      const data = await apiGet('tags', params)
      return (Array.isArray(data) ? data : []) as Tag[]
    },
    staleTime: 10 * 60 * 1000,
  })
}
