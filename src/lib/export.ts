import { supabase } from '@/lib/supabase'

export async function exportAllData() {
  const [booksRes, authorsRes, tagsRes, bookTagsRes] = await Promise.all([
    supabase.from('books').select('*, author:authors(id, name, nationality), book_tags(tag_id, tags(id, name))').order('created_at', { ascending: false }),
    supabase.from('authors').select('*').order('name'),
    supabase.from('tags').select('*').order('name'),
    supabase.from('book_tags').select('*'),
  ])

  const data = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    books: booksRes.data ?? [],
    authors: authorsRes.data ?? [],
    tags: tagsRes.data ?? [],
    book_tags: bookTagsRes.data ?? [],
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `moshu-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
