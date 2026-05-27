import { supabase } from '@/lib/supabase'

type ExportData = {
  exportedAt?: string
  version?: string
  books?: Array<Record<string, unknown>>
  authors?: Array<Record<string, unknown>>
  tags?: Array<Record<string, unknown>>
  book_tags?: Array<Record<string, unknown>>
}

export type ImportResult = {
  total: number
  success: number
  failed: number
  errors: string[]
}

function validateExportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.books)
}

export async function importFromJSON(file: File): Promise<ImportResult> {
  const result: ImportResult = { total: 0, success: 0, failed: 0, errors: [] }

  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { total: 0, success: 0, failed: 0, errors: ['JSON 格式无效'] }
  }

  if (!validateExportData(data)) {
    return { total: 0, success: 0, failed: 0, errors: ['数据格式不符：缺少 books 数组'] }
  }

  const books = data.books!
  result.total = books.length

  for (const book of books) {
    const title = String(book.title ?? '未知')
    try {
      const b = book as Record<string, unknown>
      const author = b.author as Record<string, unknown> | undefined
      const bookTags = b.book_tags as Array<Record<string, unknown>> | undefined

      const tagNames: string[] = []
      if (Array.isArray(bookTags)) {
        for (const bt of bookTags) {
          const tag = bt.tags as Record<string, unknown> | undefined
          if (tag?.name && typeof tag.name === 'string') {
            tagNames.push(tag.name)
          }
        }
      }

      const { error } = await (supabase.rpc as any)('upsert_book', {
        p_book_id: null,
        p_title: b.title ?? null,
        p_isbn: b.isbn ?? null,
        p_author_name: (author?.name as string) ?? (b.author_name as string) ?? null,
        p_author_nationality: (author?.nationality as string) ?? null,
        p_publisher: b.publisher ?? null,
        p_language: b.language ?? null,
        p_total_pages: b.total_pages ?? null,
        p_current_page: b.current_page ?? null,
        p_reading_status: b.reading_status ?? '未读',
        p_purchase_status: b.purchase_status ?? '未购',
        p_note_status: b.note_status ?? '未进行',
        p_notes: b.notes ?? null,
        p_rating: b.rating ?? null,
        p_cover_path: b.cover_path ?? null,
        p_tag_names: tagNames.length > 0 ? tagNames : [],
      })

      if (error) {
        result.failed++
        result.errors.push(`《${title}》: ${(error as { message?: string }).message ?? '未知错误'}`)
      } else {
        result.success++
      }
    } catch (e) {
      result.failed++
      result.errors.push(`《${title}》: ${e instanceof Error ? e.message : '未知错误'}`)
    }
  }

  return result
}
