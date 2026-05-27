import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthors } from '@/hooks/useAuthors'
import { useBooks } from '@/hooks/useBooks'
import { useUpdateAuthor } from '@/hooks/useUpdateAuthor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BookCard } from '@/components/BookCard'
import { Pencil, ArrowLeft } from 'lucide-react'

export default function AuthorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: authors, isLoading: authorsLoading } = useAuthors()
  const { data: books } = useBooks()
  const updateAuthor = useUpdateAuthor()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [nationality, setNationality] = useState('')
  const [bio, setBio] = useState('')

  const author = authors?.find((a) => a.id === id)
  const authorBooks = books?.filter((b) => b.author_id === id) ?? []

  if (authorsLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-7 w-36 rounded-sm" />
          <Skeleton className="h-4 w-20 rounded-sm" />
          <Skeleton className="h-20 w-full rounded-xl mt-4" />
        </div>
        <div className="space-y-3 pt-2">
          <Skeleton className="h-3 w-16 rounded-sm" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!author) {
    return <div className="text-center py-20">作者不存在</div>
  }

  const startEdit = () => {
    setName(author.name)
    setNationality(author.nationality ?? '')
    setBio(author.bio ?? '')
    setEditing(true)
  }

  const handleSave = () => {
    if (!name.trim() || !id) return
    updateAuthor.mutate({
      id,
      name: name.trim(),
      nationality: nationality.trim() || null,
      bio: bio.trim() || null,
    }, {
      onSuccess: () => setEditing(false),
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 rounded-full" onClick={() => navigate('/settings/authors')}>
          <ArrowLeft className="h-4 w-4" /> 返回作者管理
        </Button>
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => editing ? setEditing(false) : startEdit()}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> {editing ? '取消' : '编辑'}
        </Button>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>作者名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>国籍</Label>
            <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="如：中国、日本" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>简介</Label>
            <Textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="介绍这位作者..."
              className="rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setEditing(false)}>取消</Button>
            <Button className="rounded-full" onClick={handleSave} disabled={!name.trim() || updateAuthor.isPending}>
              {updateAuthor.isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-wide">{author.name}</h1>
          {author.nationality && (
            <p className="text-muted-foreground mt-1.5">{author.nationality}</p>
          )}
          {author.bio ? (
            <p className="text-sm whitespace-pre-wrap mt-5 leading-relaxed">{author.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-5">暂无简介</p>
          )}
        </div>
      )}

      <div className="pt-2">
        <h2 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-3">
          作品 ({authorBooks.length})
        </h2>
        {authorBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">暂无书籍</p>
        ) : (
          <div className="space-y-3">
            {authorBooks.map((book) => (
              <BookCard key={book.id} book={book} view="list" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
