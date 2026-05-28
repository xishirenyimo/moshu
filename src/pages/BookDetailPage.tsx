import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBook } from '@/hooks/useBook'
import { useUpdateBook } from '@/hooks/useUpdateBook'
import { useDeleteBook } from '@/hooks/useDeleteBook'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Star, Pencil, Upload, ArrowUp, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { CoverPlaceholder } from '@/components/CoverPlaceholder'
import { supabase } from '@/lib/supabase'
import { useExcerpts, useCreateExcerpt, useUpdateExcerpt, useDeleteExcerpt } from '@/hooks/useExcerpts'

const LANGUAGES = [
  { value: '', label: '不指定' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: '其他', label: '其他' },
]

type EditForm = {
  title: string
  authorName: string
  authorNationality: string
  publisher: string
  language: string
  total_pages: string
  current_page: string
  notes: string
  review: string
  isbn: string
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h3>
  )
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: book, isLoading } = useBook(id)
  const updateBook = useUpdateBook()
  const deleteBook = useDeleteBook()
  const [editing, setEditing] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const { data: excerpts, isLoading: excerptsLoading } = useExcerpts(id)
  const createExcerpt = useCreateExcerpt()
  const updateExcerpt = useUpdateExcerpt()
  const deleteExcerpt = useDeleteExcerpt()
  const [newExcerpt, setNewExcerpt] = useState('')
  const [newExcerptPage, setNewExcerptPage] = useState('')
  const [sortAsc, setSortAsc] = useState(false)
  const [editingExcerptId, setEditingExcerptId] = useState<string | null>(null)
  const [editingExcerptContent, setEditingExcerptContent] = useState('')
  const [editingExcerptPage, setEditingExcerptPage] = useState('')
  const [showBackTop, setShowBackTop] = useState(false)
  const [poppingStar, setPoppingStar] = useState(0)

  const sortedExcerpts = excerpts
    ? [...excerpts].sort((a, b) =>
        sortAsc
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : []

  const handleAddExcerpt = () => {
    if (!newExcerpt.trim() || !id) return
    createExcerpt.mutate({
      book_id: id,
      content: newExcerpt.trim(),
      page: newExcerptPage ? parseInt(newExcerptPage, 10) : null,
    }, {
      onSuccess: () => {
        setNewExcerpt('')
        setNewExcerptPage('')
      },
    })
  }

  const handleStartEditExcerpt = (excerpt: { id: string; content: string; page: number | null }) => {
    setEditingExcerptId(excerpt.id)
    setEditingExcerptContent(excerpt.content)
    setEditingExcerptPage(excerpt.page?.toString() ?? '')
  }

  const handleSaveExcerpt = () => {
    if (!editingExcerptId || !id) return
    updateExcerpt.mutate({
      id: editingExcerptId,
      book_id: id,
      content: editingExcerptContent,
      page: editingExcerptPage ? parseInt(editingExcerptPage, 10) : null,
    }, {
      onSuccess: () => setEditingExcerptId(null),
    })
  }

  const [form, setForm] = useState<EditForm>({
    title: '',
    authorName: '',
    authorNationality: '',
    publisher: '',
    language: '',
    total_pages: '',
    current_page: '',
    notes: '',
    review: '',
    isbn: '',
  })

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-20 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-14 rounded-full" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start">
          <Skeleton className="w-28 sm:w-36 aspect-[3/4] rounded-xl" />
          <div className="flex-1 space-y-2 text-center sm:text-left w-full">
            <Skeleton className="h-7 w-3/4 rounded-sm mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-1/3 rounded-sm mx-auto sm:mx-0" />
            <Skeleton className="h-4 w-1/4 rounded-sm mx-auto sm:mx-0" />
          </div>
        </div>
        {/* Sections */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-3 w-16 rounded-sm" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ))}
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!book) return <div className="text-center py-20">书籍不存在</div>

  const progress = book.total_pages
    ? Math.round((book.current_page ?? 0) / book.total_pages * 100)
    : null

  const handleRating = (r: number) => {
    setPoppingStar(r)
    setTimeout(() => setPoppingStar(0), 300)
    updateBook.mutate({ id: book.id, rating: book.rating === r ? 0 : r })
  }

  const handleStatusChange = (reading_status: string | null) => {
    if (!reading_status) return
    if (reading_status === '已读') {
      updateBook.mutate({ id: book.id, reading_status, completed_at: new Date().toISOString() })
    } else {
      updateBook.mutate({ id: book.id, reading_status, completed_at: null })
    }
  }

  const handleSaveEdit = async () => {
    const totalPages = form.total_pages ? parseInt(form.total_pages, 10) : null
    const currentPage = form.current_page ? parseInt(form.current_page, 10) : null

    let coverPath: string | null | undefined = undefined

    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop() ?? 'jpg'
      const filePath = `covers/${book.id}.${fileExt}`
      const { error: uploadErr } = await supabase.storage
        .from('book-covers')
        .upload(filePath, coverFile, { upsert: true })

      if (!uploadErr) {
        coverPath = filePath
      } else {
        console.error('封面上传失败:', uploadErr)
      }
    }

    updateBook.mutate({
      id: book.id,
      title: form.title,
      authorName: form.authorName,
      authorNationality: form.authorNationality || null,
      publisher: form.publisher || undefined,
      language: form.language || undefined,
      isbn: form.isbn || null,
      total_pages: totalPages && totalPages > 0 ? totalPages : null,
      current_page: currentPage && currentPage >= 0 ? currentPage : null,
      notes: form.notes,
      review: form.review,
      tagNames: tags,
      ...(coverPath !== undefined && { cover_path: coverPath }),
    }, {
      onSuccess: () => {
        setCoverFile(null)
        setEditing(false)
      },
    })
  }

  const startEdit = () => {
    setForm({
      title: book.title,
      authorName: book.author?.name ?? '',
      authorNationality: book.author?.nationality ?? '',
      publisher: book.publisher ?? '',
      language: book.language ?? '',
      total_pages: book.total_pages?.toString() ?? '',
      current_page: book.current_page?.toString() ?? '',
      notes: book.notes ?? '',
      review: book.review ?? '',
      isbn: book.isbn ?? '',
    })
    setTagInput('')
    setCoverFile(null)
    setTags(
      (book.book_tags as { tag_id: string; tags: { id: string; name: string } | null }[] | null)
        ?.filter((bt) => bt.tags != null)
        .map((bt) => bt.tags!.name) ?? []
    )
    setEditing(true)
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1.5 rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> 返回
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => editing ? setEditing(false) : startEdit()}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> {editing ? '取消编辑' : '编辑'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-sm font-medium h-8 px-4 hover:bg-destructive/90 transition-colors">
              删除
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>确定删除？</AlertDialogTitle>
                <AlertDialogDescription>
                  《{book.title}》将被永久删除，此操作不可撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-full"
                  onClick={() => {
                    deleteBook.mutate(book.id, { onSuccess: () => navigate('/books') })
                  }}
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-start">
        <div className="relative shrink-0 self-center sm:self-start">
          {coverFile ? (
            <img
              src={URL.createObjectURL(coverFile)}
              alt="封面预览"
              className="w-28 sm:w-36 aspect-[3/4] rounded-xl object-cover shadow-lg"
            />
          ) : book.cover_path ? (
            <img
              src={/^https?:\/\//.test(book.cover_path) ? book.cover_path : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/book-covers/${book.cover_path}`}
              alt={book.title}
              className="w-28 sm:w-36 aspect-[3/4] rounded-xl object-cover shadow-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <CoverPlaceholder title={editing ? form.title || book.title : book.title} className="w-28 sm:w-36 aspect-[3/4] rounded-xl text-2xl sm:text-3xl shadow-lg" />
          )}
          {editing && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file && file.size > 2 * 1024 * 1024) {
                    alert('封面图片不能超过 2MB')
                    return
                  }
                  if (file) setCoverFile(file)
                }}
              />
            </label>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
          {editing ? (
            <>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="text-xl font-serif font-semibold"
              />
              <Input
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                placeholder="作者"
              />
              <Input
                value={form.authorNationality}
                onChange={(e) => setForm({ ...form, authorNationality: e.target.value })}
                placeholder="作者国籍"
              />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-serif font-semibold tracking-wide">{book.title}</h1>
              <div className="text-muted-foreground">
                <p>{book.author?.name ?? '未知作者'}</p>
                {book.author?.nationality && <p className="text-sm">{book.author.nationality}</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" className="rounded-full" onClick={() => setEditing(false)}>取消</Button>
          <Button className="rounded-full" onClick={handleSaveEdit}>保存修改</Button>
        </div>
      )}

      <section>
        <SectionTitle>阅读进度</SectionTitle>
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={book.reading_status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-24 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="未读">未读</SelectItem>
              <SelectItem value="在读">在读</SelectItem>
              <SelectItem value="已读">已读</SelectItem>
              <SelectItem value="弃读">弃读</SelectItem>
            </SelectContent>
          </Select>
          {editing ? (
            <div className="flex items-center gap-2 text-sm">
              <Input
                type="number"
                min="0"
                className="w-20 h-8 rounded-full"
                value={form.current_page}
                onChange={(e) => setForm({ ...form, current_page: e.target.value })}
                placeholder="当前"
              />
              <span className="text-muted-foreground">/</span>
              <Input
                type="number"
                min="1"
                className="w-20 h-8 rounded-full"
                value={form.total_pages}
                onChange={(e) => setForm({ ...form, total_pages: e.target.value })}
                placeholder="总页数"
              />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              页数 {book.current_page ?? 0} / {book.total_pages ?? '?'}
            </span>
          )}
        </div>
        {progress !== null && (
          <div className="h-2 bg-secondary rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {book.completed_at && (
          <p className="text-xs text-muted-foreground mt-2">
            读完于 {new Date(book.completed_at).toLocaleDateString('zh-CN')}
          </p>
        )}
      </section>

      <Separator />

      <section>
        <SectionTitle>评分</SectionTitle>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((r) => (
            <button key={r} onClick={() => handleRating(r)} className={`p-1 transition-transform hover:scale-110 ${poppingStar === r ? 'animate-star-pop' : ''}`}>
              <Star
                className={`h-7 w-7 transition-colors ${
                  (book.rating ?? 0) >= r
                    ? 'fill-amber-500 text-amber-500'
                    : 'text-muted-foreground/25 hover:text-amber-300'
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <section>
        <SectionTitle>评价</SectionTitle>
        {editing ? (
          <Textarea
            rows={3}
            value={form.review}
            onChange={(e) => setForm({ ...form, review: e.target.value })}
            placeholder="简短评价这本书..."
            className="rounded-xl"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{book.review || '—'}</p>
        )}
      </section>

      <Separator />

      <section>
        <SectionTitle>书籍信息</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">出版社</Label>
            {editing ? (
              <Input
                value={form.publisher}
                onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                className="h-8 mt-1 rounded-lg"
              />
            ) : (
              <p className="text-sm mt-0.5">{book.publisher || '—'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">语言</Label>
            {editing ? (
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v ?? '' })}>
                <SelectTrigger className="h-8 mt-1 rounded-lg">
                  <SelectValue placeholder="不指定" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm mt-0.5">{book.language || '—'}</p>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">ISBN</Label>
            {editing ? (
              <Input
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                className="h-8 mt-1 rounded-lg font-mono"
              />
            ) : (
              <p className="text-sm mt-0.5 font-mono">{book.isbn || '—'}</p>
            )}
          </div>
        </div>
      </section>

      <Separator />

      <section>
        <SectionTitle>标签</SectionTitle>
        {editing ? (
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer rounded-full px-3"
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                >
                  {tag} &times;
                </Badge>
              ))}
            </div>
            <Input
              placeholder="输入标签后按回车"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  if (!tags.includes(tagInput.trim())) {
                    setTags([...tags, tagInput.trim()])
                  }
                  setTagInput('')
                }
              }}
              className="h-8 rounded-full"
            />
          </div>
        ) : (
          <div className="flex gap-1.5 flex-wrap">
            {(book.book_tags?.length ?? 0) > 0
              ? (book.book_tags as { tag_id: string; tags: { id: string; name: string } | null }[]).map((bt) =>
                  bt.tags ? <Badge key={bt.tag_id} variant="secondary" className="rounded-full px-3">{bt.tags.name}</Badge> : null
                )
              : <span className="text-sm text-muted-foreground">暂无标签</span>}
          </div>
        )}
      </section>

      <Separator />

      <section>
        <SectionTitle>购阅状态</SectionTitle>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">购买情况</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{book.purchase_status}</span>
              <Switch
                checked={book.purchase_status === '已购'}
                onCheckedChange={(v) =>
                  updateBook.mutate({ id: book.id, purchase_status: v ? '已购' : '未购' })
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">笔记整理</Label>
            <Select
              value={book.note_status}
              onValueChange={(v) => v && updateBook.mutate({ id: book.id, note_status: v })}
            >
              <SelectTrigger className="w-28 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="未进行">未进行</SelectItem>
                <SelectItem value="进行中">进行中</SelectItem>
                <SelectItem value="已完成">已完成</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      <section>
        <SectionTitle>备注</SectionTitle>
        {editing ? (
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="添加备注..."
            className="rounded-xl"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{book.notes || '—'}</p>
        )}
      </section>

      <Separator />

      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>摘录</SectionTitle>
          <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => setSortAsc(!sortAsc)}>
            {sortAsc ? '最早在前' : '最新在前'}
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="输入摘录内容..."
            value={newExcerpt}
            onChange={(e) => setNewExcerpt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAddExcerpt()
              }
            }}
            className="flex-1 h-9 text-sm rounded-xl"
          />
          <Input
            type="number"
            min="0"
            placeholder="页码"
            value={newExcerptPage}
            onChange={(e) => setNewExcerptPage(e.target.value)}
            className="w-20 h-9 text-sm rounded-xl"
          />
          <Button size="sm" className="rounded-full" onClick={handleAddExcerpt} disabled={createExcerpt.isPending || !newExcerpt.trim()}>
            <Plus className="h-4 w-4 mr-1" />添加
          </Button>
        </div>

        {excerptsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : sortedExcerpts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">暂无摘录</p>
        ) : (
          <div className="space-y-2.5">
            {sortedExcerpts.map((excerpt) => (
              <div key={excerpt.id} className="border rounded-xl p-3.5 text-sm bg-card/50">
                {editingExcerptId === excerpt.id ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={2}
                      value={editingExcerptContent}
                      onChange={(e) => setEditingExcerptContent(e.target.value)}
                      className="rounded-xl"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="页码"
                        value={editingExcerptPage}
                        onChange={(e) => setEditingExcerptPage(e.target.value)}
                        className="w-20 h-8 rounded-full"
                      />
                      <div className="flex-1" />
                      <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditingExcerptId(null)}>取消</Button>
                      <Button size="sm" className="rounded-full" onClick={handleSaveExcerpt} disabled={!editingExcerptContent.trim()}>保存</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap leading-relaxed">{excerpt.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {excerpt.page != null && <span>第 {excerpt.page} 页</span>}
                        <span>{new Date(excerpt.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => handleStartEditExcerpt(excerpt)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => deleteExcerpt.mutate(excerpt)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        最后更新：{new Date(book.updated_at).toLocaleString('zh-CN')}
      </p>

      {showBackTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-6 z-50 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
