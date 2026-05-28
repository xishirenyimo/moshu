import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateBook } from '@/hooks/useCreateBook'
import { useSearchISBN } from '@/hooks/useSearchISBN'
import { bookFormSchema, type BookFormInput } from '@/validators/bookSchemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScanSearch } from 'lucide-react'
import { IsbnScanner } from '@/components/IsbnScanner'
import { LoadingSpinner } from '@/components/LoadingSpinner'

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

export default function AddBookPage() {
  const navigate = useNavigate()
  const createBook = useCreateBook()
  const { search, loading: searching } = useSearchISBN()
  const [isbnInput, setIsbnInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookFormInput>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: '',
      authorName: '',
      publisher: '',
      language: '',
      readingStatus: '未读',
      purchaseStatus: '未购',
      noteStatus: '未进行',
    },
  })

  const language = watch('language')

  const handleISBNSearch = async (override?: string) => {
    const target = (override ?? isbnInput).trim()
    if (!target) return
    if (override) setIsbnInput(target)
    const result = await search(target)
    if (result?.found && result.book) {
      setValue('title', result.book.title)
      setValue('authorName', result.book.authors[0] ?? '')
      setValue('publisher', result.book.publisher ?? '')
      setValue('language', result.book.language ?? '')
      setValue('totalPages', result.book.total_pages ?? null)
      setValue('isbn', result.book.isbn ?? undefined)
      setCoverUrl(result.book.cover_path ?? null)
    }
  }

  const handleScan = (code: string) => {
    void handleISBNSearch(code)
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const onSubmit = (data: BookFormInput) => {
    createBook.mutate(
      {
        title: data.title,
        isbn: data.isbn,
        authorName: data.authorName,
        authorNationality: data.authorNationality,
        publisher: data.publisher,
        language: data.language,
        totalPages: data.totalPages ?? null,
        currentPage: data.currentPage ?? null,
        readingStatus: data.readingStatus ?? '未读',
        purchaseStatus: data.purchaseStatus ?? '未购',
        noteStatus: data.noteStatus ?? '未进行',
        notes: data.notes ?? '',
        tagNames: tags,
        coverPath: coverUrl ?? undefined,
      },
      {
        onSuccess: (result) => {
          if (result?.book_id) {
            navigate(`/books/${result.book_id}`)
          }
        },
      }
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-serif font-semibold tracking-wide">录入书籍</h1>

      <Card className="rounded-xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ISBN 查询</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="输入 ISBN 或扫码..."
            value={isbnInput}
            onChange={(e) => setIsbnInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleISBNSearch(); }}
            className="rounded-xl"
          />
          <IsbnScanner onScan={handleScan} />
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => { void handleISBNSearch(); }} disabled={searching || !isbnInput.trim()}>
            <ScanSearch className="h-4 w-4 mr-1.5" />
            {searching ? '查询中...' : '查询'}
          </Button>
        </CardContent>
      </Card>

      {coverUrl && (
        <div className="flex justify-center">
          <img
            src={coverUrl}
            alt="封面预览"
            className="h-48 rounded-lg shadow-md object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">书名 *</Label>
        <Input id="title" {...register('title')} placeholder="请输入书名" className="rounded-xl" />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="authorName">作者</Label>
        <Input id="authorName" {...register('authorName')} placeholder="请输入作者名" className="rounded-xl" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authorNationality">作者国籍</Label>
        <Input id="authorNationality" {...register('authorNationality')} placeholder="如：中国、日本、美国" className="rounded-xl" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="publisher">出版社</Label>
        <Input id="publisher" {...register('publisher')} placeholder="请输入出版社" className="rounded-xl" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>语言</Label>
          <Select onValueChange={(v) => setValue('language', v ?? undefined)} value={language || ''}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="不指定" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalPages">总页数</Label>
          <Input
            id="totalPages"
            type="number"
            min="1"
            {...register('totalPages', { valueAsNumber: true })}
            placeholder="0"
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>标签</Label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => removeTag(tag)}
            >
              {tag} &times;
            </span>
          ))}
        </div>
        <Input
          placeholder="输入标签后按回车"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          className="rounded-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">备注</Label>
        <Textarea id="notes" rows={3} {...register('notes')} placeholder="添加备注..." className="rounded-xl" />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(-1)}>取消</Button>
        <Button type="submit" className="rounded-full gap-2" disabled={createBook.isPending}>
          {createBook.isPending && <LoadingSpinner />}
          {createBook.isPending ? '添加中...' : '添加书籍'}
        </Button>
      </div>
    </form>
  )
}
