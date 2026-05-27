import { Button } from '@/components/ui/button'
import { useFilterStore, type ReadingStatus } from '@/stores/filterStore'
import { BookOpen, Bookmark, Globe, Eye } from 'lucide-react'

const statuses: { label: string; value: ReadingStatus; icon: typeof BookOpen }[] = [
  { label: '全部', value: '', icon: Globe },
  { label: '在读', value: '在读', icon: BookOpen },
  { label: '已读', value: '已读', icon: Bookmark },
  { label: '未读', value: '未读', icon: Eye },
]

export function FilterBar() {
  const readingStatus = useFilterStore((s) => s.readingStatus)
  const setReadingStatus = useFilterStore((s) => s.setReadingStatus)

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {statuses.map((s) => {
        const active = readingStatus === s.value
        return (
          <Button
            key={s.value}
            variant={active ? 'default' : 'outline'}
            size="sm"
            className={`shrink-0 rounded-full px-4 gap-1.5 transition-all ${
              active
                ? 'shadow-sm'
                : 'hover:bg-accent hover:text-accent-foreground hover:border-primary/30'
            }`}
            onClick={() => setReadingStatus(s.value)}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </Button>
        )
      })}
    </div>
  )
}
