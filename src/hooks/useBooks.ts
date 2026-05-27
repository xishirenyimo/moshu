import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { useFilterStore } from '@/stores/filterStore'
import { useSortStore } from '@/stores/sortStore'
import type { Book } from '@/types/app'

function sortToConfig(mode: string) {
  switch (mode) {
    case 'title':
      return 'title.asc.nullslast'
    case 'rating':
      return 'rating.desc.nullslast'
    default:
      return 'updated_at.desc.nullslast'
  }
}

export function useBooks() {
  const search = useFilterStore((s) => s.search)
  const readingStatus = useFilterStore((s) => s.readingStatus)
  const purchaseStatus = useFilterStore((s) => s.purchaseStatus)
  const noteStatus = useFilterStore((s) => s.noteStatus)
  const tagIds = useFilterStore((s) => s.tagIds)
  const authorIds = useFilterStore((s) => s.authorIds)
  const nationality = useFilterStore((s) => s.nationality)
  const sortMode = useSortStore((s) => s.mode)

  return useQuery({
    queryKey: ['books', { search, readingStatus, purchaseStatus, noteStatus, tagIds, authorIds, nationality, sortMode }],
    queryFn: async (): Promise<Book[]> => {
      const params = new URLSearchParams()
      params.set('select', '*,author:author_id(id,name,nationality),book_tags(tag_id,tags(id,name))')
      params.set('order', sortToConfig(sortMode))

      if (search) {
        params.set('title', `ilike.*${search}*`)
      }
      if (readingStatus) {
        params.set('reading_status', `eq.${readingStatus}`)
      }
      if (purchaseStatus) {
        params.set('purchase_status', `eq.${purchaseStatus}`)
      }
      if (noteStatus) {
        params.set('note_status', `eq.${noteStatus}`)
      }
      if (authorIds.length > 0) {
        params.set('author_id', `in.(${authorIds.join(',')})`)
      }

      const data = await apiGet('books', params)
      let result = (Array.isArray(data) ? data : []) as Book[]

      if (nationality) {
        result = result.filter((b) => b.author?.nationality === nationality)
      }
      if (tagIds.length > 0) {
        result = result.filter((b) =>
          b.book_tags?.some((bt) => bt.tags && tagIds.includes(bt.tags.id))
        )
      }

      return result
    },
  })
}
