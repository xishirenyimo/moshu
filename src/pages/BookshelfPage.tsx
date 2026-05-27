import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooks } from '@/hooks/useBooks'
import { BookCard } from '@/components/BookCard'
import { FilterBar } from '@/components/FilterBar'
import { FilterSheet } from '@/components/FilterSheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useViewStore } from '@/stores/viewStore'
import { useSortStore } from '@/stores/sortStore'
import { useFilterStore } from '@/stores/filterStore'
import { LayoutGrid, List, SlidersHorizontal, ArrowUpDown, Search, Library, BookOpen, Bookmark } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function BookshelfPage() {
  const navigate = useNavigate()
  const { data: books, isLoading } = useBooks()
  const viewMode = useViewStore((s) => s.mode)
  const setViewMode = useViewStore((s) => s.setMode)
  const sortMode = useSortStore((s) => s.mode)
  const setSortMode = useSortStore((s) => s.setMode)
  const clearAll = useFilterStore((s) => s.clearAll)
  const [filterOpen, setFilterOpen] = useState(false)

  const search = useFilterStore((s) => s.search)
  const setSearch = useFilterStore((s) => s.setSearch)
  const readingStatus = useFilterStore((s) => s.readingStatus)
  const purchaseStatus = useFilterStore((s) => s.purchaseStatus)
  const noteStatus = useFilterStore((s) => s.noteStatus)
  const tagIds = useFilterStore((s) => s.tagIds)
  const nationality = useFilterStore((s) => s.nationality)
  const [searchInput, setSearchInput] = useState(search)
  const timerRef = useRef<number | null>(null)

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setSearch(value), 300)
  }

  const hasFilters = search !== '' || readingStatus !== '' || purchaseStatus !== '' ||
    noteStatus !== '' || tagIds.length > 0 || nationality !== ''

  const totalBooks = books?.length ?? 0
  const finishedCount = books?.filter((b) => b.reading_status === '已读').length ?? 0
  const readingCount = books?.filter((b) => b.reading_status === '在读').length ?? 0

  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 p-3 text-center space-y-1.5">
              <Skeleton className="h-7 w-10 mx-auto rounded-md" />
              <Skeleton className="h-3 w-12 mx-auto rounded-sm" />
            </div>
          ))}
        </div>
        {/* Filter pills */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full" />
          ))}
        </div>
        {/* Book grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 overflow-hidden space-y-2">
              <Skeleton className="aspect-[3/4] w-full rounded-none" />
              <div className="p-3 space-y-1.5">
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-1/2 rounded-sm" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-4 w-8 rounded-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="relative md:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索书名..."
          value={searchInput}
          className="pl-9 rounded-xl h-10"
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center rounded-xl border-border/50">
          <div className="text-2xl font-semibold tabular-nums">{totalBooks}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <Library className="h-3 w-3" /> 总藏书
          </div>
        </Card>
        <Card className="p-3 text-center rounded-xl border-border/50">
          <div className="text-2xl font-semibold tabular-nums text-amber-600">{readingCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <BookOpen className="h-3 w-3" /> 在读
          </div>
        </Card>
        <Card className="p-3 text-center rounded-xl border-border/50">
          <div className="text-2xl font-semibold tabular-nums text-emerald-600">{finishedCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
            <Bookmark className="h-3 w-3" /> 已读
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <FilterBar />
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortMode === 'updated_at' ? '最近修改' : sortMode === 'title' ? '书名' : '评分'}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortMode('updated_at')}>
                最近修改
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('title')}>书名 A-Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode('rating')}>评分</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={hasFilters ? 'default' : 'ghost'}
            size="icon"
            className="rounded-full"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {totalBooks === 0 && hasFilters ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">没有书籍匹配当前条件</p>
          <Button variant="outline" className="rounded-full" onClick={clearAll}>
            清除全部筛选
          </Button>
        </div>
      ) : totalBooks === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-accent/30 flex items-center justify-center">
            <Library className="h-10 w-10 text-primary/70" />
          </div>
          <h2 className="text-xl font-serif font-semibold mb-2 tracking-wide">开始你的图书馆</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">每一本好书都值得被记录</p>
          <Button onClick={() => navigate('/books/add')} size="lg" className="rounded-full px-8">
            <BookOpen className="h-4 w-4 mr-2" /> 添加第一本书
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {books?.map((book) => (
            <BookCard key={book.id} book={book} view="grid" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {books?.map((book) => (
            <BookCard key={book.id} book={book} view="list" />
          ))}
        </div>
      )}

      <FilterSheet open={filterOpen} onOpenChange={setFilterOpen} />
    </div>
  )
}
