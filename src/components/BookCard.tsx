import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'
import { CoverPlaceholder } from '@/components/CoverPlaceholder'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''

function CoverImage({ coverPath, title, className }: { coverPath: string | null; title: string; className: string }) {
  if (coverPath) {
    const src = /^https?:\/\//.test(coverPath)
      ? coverPath
      : `${supabaseUrl}/storage/v1/object/public/book-covers/${coverPath}`
    return (
      <img
        src={src}
        alt={title}
        className={className}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    )
  }
  return <CoverPlaceholder title={title} className={className} />
}

type BookCardProps = {
  book: {
    id: string
    title: string
    author?: { id: string; name: string; nationality: string | null } | null
    reading_status: string
    total_pages: number | null
    current_page: number | null
    rating: number | null
    cover_path: string | null
    book_tags?: { tag_id: string; tags: { id: string; name: string } | null }[] | null
  }
  view?: 'grid' | 'list'
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  '未读': 'secondary',
  '在读': 'default',
  '已读': 'outline',
  '弃读': 'secondary',
}

export function BookCard({ book, view = 'grid' }: BookCardProps) {
  const progress = book.total_pages
    ? Math.round((book.current_page ?? 0) / book.total_pages * 100)
    : null

  if (view === 'list') {
    return (
      <Link to={`/books/${book.id}`}>
        <Card className="flex items-center gap-4 p-4 hover:bg-accent/30 hover:shadow-sm transition-all duration-200 rounded-xl border-border/60">
          <CoverImage coverPath={book.cover_path} title={book.title} className="w-12 h-16 rounded-md shrink-0 text-lg object-cover shadow-sm" />
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="font-medium truncate leading-snug">{book.title}</div>
            <div className="text-sm text-muted-foreground">
              <span className="truncate block">{book.author?.name ?? '未知作者'}</span>
            </div>
            {(book.book_tags?.length ?? 0) > 0 && (
              <div className="flex gap-1 flex-wrap">
                {book.book_tags!.filter(bt => bt.tags).slice(0, 3).map(bt => (
                  <Badge key={bt.tag_id} variant="secondary" className="text-[10px] px-1.5 py-0 leading-relaxed rounded-sm">{bt.tags!.name}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant={statusVariant[book.reading_status] ?? 'secondary'} className="text-xs">
              {book.reading_status}
            </Badge>
            {book.rating != null && book.rating > 0 && (
              <div className="flex items-center text-amber-500 text-sm">
                <Star className="h-3.5 w-3.5 fill-current mr-0.5" /> {book.rating}
              </div>
            )}
            {progress !== null && (
              <div className="text-sm text-muted-foreground w-12 text-right tabular-nums">
                {progress}%
              </div>
            )}
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link to={`/books/${book.id}`}>
      <Card className="group overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full rounded-xl border-border/60">
        <div className="aspect-[3/4] relative bg-muted">
          <CoverImage coverPath={book.cover_path} title={book.title} className="absolute inset-0 text-3xl object-cover group-hover:scale-105 transition-transform duration-300" />
          {progress !== null && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div className="p-3 space-y-1.5">
          <div className="font-medium text-sm leading-snug line-clamp-2 tracking-tight">{book.title}</div>
          <div className="text-xs text-muted-foreground">
            <span className="truncate block">{book.author?.name ?? '未知作者'}</span>
          </div>
          {(book.book_tags?.length ?? 0) > 0 && (
            <div className="flex gap-1 flex-wrap">
              {book.book_tags!.filter(bt => bt.tags).slice(0, 3).map(bt => (
                <Badge key={bt.tag_id} variant="secondary" className="text-[10px] px-1.5 py-0 leading-relaxed rounded-sm">{bt.tags!.name}</Badge>
              ))}
              {(book.book_tags!.filter(bt => bt.tags).length > 3) && (
                <span className="text-[10px] text-muted-foreground self-center">+{book.book_tags!.filter(bt => bt.tags).length - 3}</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <Badge variant={statusVariant[book.reading_status] ?? 'secondary'} className="text-[11px] px-2">
              {book.reading_status}
            </Badge>
            {book.rating != null && book.rating > 0 && (
              <div className="flex items-center text-amber-500 text-xs gap-0.5">
                <Star className="h-3 w-3 fill-current" /> {book.rating}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
