import { useState } from 'react'
import { toast } from 'sonner'

type ISBNResult = {
  found: boolean
  error?: 'invalid_isbn' | 'not_found' | 'service_unavailable'
  book?: {
    isbn: string
    title: string
    authors: string[]
    publisher: string | null
    language: string | null
    total_pages: number | null
    cover_path: string | null
    source: 'google_books' | 'open_library'
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function useSearchISBN() {
  const [loading, setLoading] = useState(false)

  const search = async (isbn: string): Promise<ISBNResult | null> => {
    setLoading(true)
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/search-isbn`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ isbn }),
        }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json() as ISBNResult

      if (!data.found) {
        if (data.error === 'invalid_isbn') {
          toast.error('ISBN 格式不正确')
        } else if (data.error === 'service_unavailable') {
          toast.error('图书查询服务暂时不可用，请手动填写书籍信息')
        } else {
          toast.error('未找到该 ISBN 对应的图书信息')
        }
        return data
      }

      toast.success(`找到：${data.book?.title ?? '未知书名'}`)
      return data
    } catch (e) {
      console.error('ISBN search failed:', e)
      toast.error('查询失败，请检查网络')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { search, loading }
}
