import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/types'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { current_page: current, last_page: last, total } = meta
  if (total === 0) return null

  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-4 sm:flex-row">
      <p className="text-sm text-slate-500">
        {meta.from ?? 0}–{meta.to ?? 0} sur {total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p) => (
          <Button
            key={p}
            variant={p === current ? 'default' : 'outline'}
            size="icon"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          disabled={current >= last}
          onClick={() => onPageChange(current + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
