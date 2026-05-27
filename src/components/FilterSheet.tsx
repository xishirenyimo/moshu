import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useFilterStore, type PurchaseStatus, type NoteStatus } from '@/stores/filterStore'
import { useAuthors } from '@/hooks/useAuthors'
import { useTags } from '@/hooks/useTags'
import { X } from 'lucide-react'

type FilterSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FilterSheet({ open, onOpenChange }: FilterSheetProps) {
  const { data: authors } = useAuthors()
  const { data: tags } = useTags()
  const filter = useFilterStore()

  const nationalities = [...new Set(authors?.map((a) => a.nationality).filter(Boolean) ?? [])] as string[]

  const hasAny = filter.search !== '' || filter.readingStatus !== '' || filter.purchaseStatus !== '' ||
    filter.noteStatus !== '' || filter.tagIds.length > 0 || filter.nationality !== ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[65%] sm:h-full sm:max-w-sm sm:side-right rounded-t-2xl sm:rounded-t-none">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <SheetTitle>筛选</SheetTitle>
          {hasAny && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs text-muted-foreground hover:text-foreground"
              onClick={filter.clearAll}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              清除全部
            </Button>
          )}
        </SheetHeader>
        <div className="space-y-6 mt-6">
          <div className="space-y-2.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">购买状态</Label>
            <div className="flex gap-2">
              {(['', '未购', '已购'] as PurchaseStatus[]).map((s) => (
                <Badge
                  key={s || 'all'}
                  variant={filter.purchaseStatus === s ? 'default' : 'outline'}
                  className={`cursor-pointer rounded-full px-3 py-1 transition-all duration-150 ${
                    filter.purchaseStatus === s ? 'shadow-sm' : 'hover:border-primary/40'
                  }`}
                  onClick={() => filter.setPurchaseStatus(s)}
                >
                  {s || '全部'}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">笔记状态</Label>
            <div className="flex gap-2 flex-wrap">
              {(['', '未进行', '进行中', '已完成'] as NoteStatus[]).map((s) => (
                <Badge
                  key={s || 'all'}
                  variant={filter.noteStatus === s ? 'default' : 'outline'}
                  className={`cursor-pointer rounded-full px-3 py-1 transition-all duration-150 ${
                    filter.noteStatus === s ? 'shadow-sm' : 'hover:border-primary/40'
                  }`}
                  onClick={() => filter.setNoteStatus(s)}
                >
                  {s || '全部'}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              国籍 {nationalities.length > 0 && `(${nationalities.length})`}
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {nationalities.length === 0 ? (
                <span className="text-xs text-muted-foreground">暂无</span>
              ) : (
                nationalities.map((n) => (
                  <Badge
                    key={n}
                    variant={filter.nationality === n ? 'default' : 'outline'}
                    className={`cursor-pointer rounded-full px-3 py-1 transition-all duration-150 ${
                      filter.nationality === n ? 'shadow-sm' : 'hover:border-primary/40'
                    }`}
                    onClick={() => filter.setNationality(filter.nationality === n ? '' : n)}
                  >
                    {n}
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              标签 {tags && tags.length > 0 && `(${tags.length})`}
            </Label>
            <div className="flex gap-1.5 flex-wrap">
              {!tags || tags.length === 0 ? (
                <span className="text-xs text-muted-foreground">暂无</span>
              ) : (
                tags.map((t) => (
                  <Badge
                    key={t.id}
                    variant={filter.tagIds.includes(t.id) ? 'default' : 'outline'}
                    className={`cursor-pointer rounded-full px-3 py-1 transition-all duration-150 ${
                      filter.tagIds.includes(t.id) ? 'shadow-sm' : 'hover:border-primary/40'
                    }`}
                    onClick={() => {
                      if (filter.tagIds.includes(t.id)) {
                        filter.setTagIds(filter.tagIds.filter((id) => id !== t.id))
                      } else {
                        filter.setTagIds([...filter.tagIds, t.id])
                      }
                    }}
                  >
                    {t.name}
                  </Badge>
                ))
              )}
            </div>
          </div>

          {hasAny && (
            <Button variant="outline" className="w-full rounded-full" onClick={filter.clearAll}>
              清除全部筛选
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
