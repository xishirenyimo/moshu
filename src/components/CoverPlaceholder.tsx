import { memo } from 'react'

type CoverPlaceholderProps = {
  title: string
  className?: string
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  return Math.abs(hash)
}

const COLORS = [
  ['#b45309', '#92400e'], ['#c2410c', '#9a3412'], ['#d97706', '#b45309'],
  ['#047857', '#065f46'], ['#0e7490', '#155e75'], ['#1d4ed8', '#1e3a8a'],
  ['#6d28d9', '#5b21b6'], ['#be185d', '#9d174d'], ['#57534e', '#44403c'],
  ['#0f766e', '#115e59'], ['#7c3aed', '#6d28d9'], ['#e11d48', '#be123c'],
]

export const CoverPlaceholder = memo(function CoverPlaceholder({ title, className = '' }: CoverPlaceholderProps) {
  const [base] = COLORS[hashString(title) % COLORS.length]
  const char = title.trim().charAt(0) || '?'

  return (
    <div
      className={`flex items-center justify-center select-none font-serif font-bold text-white ${className}`}
      style={{ background: `linear-gradient(160deg, ${base}, ${base}dd)` }}
    >
      <span className="drop-shadow-sm">{char}</span>
    </div>
  )
})
