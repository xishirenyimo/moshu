import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthors } from '@/hooks/useAuthors'
import { useBooks } from '@/hooks/useBooks'
import { useDeleteAuthor } from '@/hooks/useDeleteAuthor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Search, Trash2, ChevronRight } from 'lucide-react'

export default function AuthorManagePage() {
  const navigate = useNavigate()
  const { data: authors, isLoading } = useAuthors()
  const { data: books } = useBooks()
  const deleteAuthor = useDeleteAuthor()
  const [search, setSearch] = useState('')

  const authorBookCounts = useMemo(() => {
    const counts = new Map<string, number>()
    books?.forEach((book) => {
      if (book.author_id) {
        counts.set(book.author_id, (counts.get(book.author_id) ?? 0) + 1)
      }
    })
    return counts
  }, [books])

  const filteredAuthors = useMemo(() => {
    if (!authors) return []
    if (!search.trim()) return authors
    const q = search.trim().toLowerCase()
    return authors.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.nationality && a.nationality.toLowerCase().includes(q))
    )
  }, [authors, search])

  if (isLoading) {
    return (
      <div className="max-w-lg space-y-5">
        <Skeleton className="h-7 w-28 rounded-sm" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-4 w-24 rounded-sm" />
        <div className="divide-y border rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-3 w-32 rounded-sm" />
              </div>
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-serif font-semibold tracking-wide">作者管理</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索作者名或国籍..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        共 {filteredAuthors.length} 位作者
        {search.trim() && authors && `（共 ${authors.length} 位）`}
      </p>

      {filteredAuthors.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {search.trim() ? '没有匹配的作者' : '暂无作者'}
        </p>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {filteredAuthors.map((author) => {
            const bookCount = authorBookCounts.get(author.id) ?? 0
            const canDelete = bookCount === 0

            return (
              <div
                key={author.id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <button
                  type="button"
                  className="text-left flex-1 min-w-0 flex items-center gap-2"
                  onClick={() => navigate(`/settings/authors/${author.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        author.nationality,
                        bookCount > 0 ? `${bookCount} 本书` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </button>

                {canDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger>
                      <Button variant="ghost" size="icon" className="rounded-full ml-1" title="删除作者">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>确定删除？</AlertDialogTitle>
                        <AlertDialogDescription>
                          作者「{author.name}」将被永久删除。此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-full"
                          onClick={() => deleteAuthor.mutate(author.id)}
                          disabled={deleteAuthor.isPending}
                        >
                          {deleteAuthor.isPending ? '删除中...' : '删除'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button variant="ghost" size="icon" className="rounded-full ml-1" disabled title="该作者有关联书籍，无法删除">
                    <Trash2 className="h-4 w-4 text-muted-foreground/20" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
