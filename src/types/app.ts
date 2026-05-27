export type Author = {
  id: string
  name: string
  nationality: string | null
  bio: string | null
  user_id: string
  created_at: string
}

export type Tag = {
  id: string
  name: string
  user_id: string
  created_at: string
}

export type Excerpt = {
  id: string
  book_id: string
  content: string
  page: number | null
  created_at: string
}

export type BookTag = {
  tag_id: string
  tags: Tag | null
}

export type Book = {
  id: string
  isbn: string | null
  title: string
  author_id: string | null
  author: Author | null
  publisher: string | null
  language: string | null
  total_pages: number | null
  current_page: number | null
  completed_at: string | null
  reading_status: '未读' | '在读' | '已读' | '弃读'
  purchase_status: '未购' | '已购'
  note_status: '未进行' | '进行中' | '已完成'
  notes: string | null
  review: string | null
  rating: number | null
  cover_path: string | null
  user_id: string
  created_at: string
  updated_at: string
  book_tags: BookTag[] | null
}
