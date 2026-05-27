import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRpc } from '@/lib/api'
import { toast } from 'sonner'

type CreateBookInput = {
  id?: string
  title: string
  isbn?: string
  authorName?: string
  authorNationality?: string
  publisher?: string
  language?: string
  totalPages?: number | null
  currentPage?: number | null
  readingStatus?: string
  purchaseStatus?: string
  noteStatus?: string
  notes?: string
  rating?: number | null
  coverPath?: string
  tagNames?: string[]
}

type UpsertBookResult = {
  book_id: string
  author_id: string
}

export function useCreateBook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateBookInput): Promise<UpsertBookResult | null> => {
      const data = await apiRpc('upsert_book', {
        p_book_id: input.id ?? null,
        p_title: input.title,
        p_isbn: input.isbn ?? null,
        p_author_name: input.authorName ?? null,
        p_author_nationality: input.authorNationality ?? null,
        p_publisher: input.publisher ?? null,
        p_language: input.language ?? null,
        p_total_pages: input.totalPages ?? null,
        p_current_page: input.currentPage ?? null,
        p_reading_status: input.readingStatus ?? null,
        p_purchase_status: input.purchaseStatus ?? null,
        p_note_status: input.noteStatus ?? null,
        p_notes: input.notes ?? null,
        p_rating: input.rating ?? null,
        p_cover_path: input.coverPath ?? null,
        p_tag_names: input.tagNames ?? [],
      })

      return data as UpsertBookResult | null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      toast.success('书籍已添加')
    },
    onError: (error) => {
      console.error('创建书籍失败:', error)
      toast.error(error instanceof Error ? error.message : '添加失败，请重试')
    },
  })
}
