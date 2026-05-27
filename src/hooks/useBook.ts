import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Book } from '@/types/app'

export function useBook(id: string | undefined) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: async (): Promise<Book | null> => {
      if (!id) return null
      const params = new URLSearchParams()
      params.set('select', '*,author:author_id(id,name,nationality),book_tags(tag_id,tags(id,name))')
      params.set('id', `eq.${id}`)

      const data = await apiGet('books', params)
      const result = Array.isArray(data) ? data[0] : data
      return (result as Book) ?? null
    },
    enabled: !!id,
  })
}
