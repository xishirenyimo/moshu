export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      authors: {
        Row: {
          id: string
          name: string
          nationality: string | null
          bio: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          nationality?: string | null
          bio?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          nationality?: string | null
          bio?: string | null
          user_id?: string
          created_at?: string
        }
      }
      books: {
        Row: {
          id: string
          isbn: string | null
          title: string
          author_id: string | null
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
        }
        Insert: {
          id?: string
          isbn?: string | null
          title: string
          author_id?: string | null
          publisher?: string | null
          language?: string | null
          total_pages?: number | null
          current_page?: number | null
          completed_at?: string | null
          reading_status?: '未读' | '在读' | '已读' | '弃读'
          purchase_status?: '未购' | '已购'
          note_status?: '未进行' | '进行中' | '已完成'
          notes?: string | null
          review?: string | null
          rating?: number | null
          cover_path?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          isbn?: string | null
          title?: string
          author_id?: string | null
          publisher?: string | null
          language?: string | null
          total_pages?: number | null
          current_page?: number | null
          completed_at?: string | null
          reading_status?: '未读' | '在读' | '已读' | '弃读'
          purchase_status?: '未购' | '已购'
          note_status?: '未进行' | '进行中' | '已完成'
          notes?: string | null
          review?: string | null
          rating?: number | null
          cover_path?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
        }
      }
      book_tags: {
        Row: {
          book_id: string
          tag_id: string
        }
        Insert: {
          book_id: string
          tag_id: string
        }
        Update: {
          book_id?: string
          tag_id?: string
        }
      }
      excerpts: {
        Row: {
          id: string
          book_id: string
          content: string
          page: number | null
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          content: string
          page?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          content?: string
          page?: number | null
          created_at?: string
        }
      }
    }
    Enums: {
      reading_status_enum: '未读' | '在读' | '已读' | '弃读'
      purchase_status_enum: '未购' | '已购'
      note_status_enum: '未进行' | '进行中' | '已完成'
    }
    Functions: {
      upsert_book: {
        Args: {
          p_book_id?: string
          p_title: string
          p_isbn?: string
          p_author_name?: string
          p_author_nationality?: string
          p_publisher?: string
          p_language?: string
          p_total_pages?: number
          p_current_page?: number
          p_reading_status?: string
          p_purchase_status?: string
          p_note_status?: string
          p_notes?: string
          p_rating?: number
          p_cover_path?: string
          p_tag_names?: string[]
        }
        Returns: { book_id: string; author_id: string }
      }
    }
  }
}
