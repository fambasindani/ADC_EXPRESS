import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  hint?: string
  accent?: 'red' | 'cyan' | 'orange' | 'green' | 'slate'
}

const accentStyles: Record<NonNullable<StatCardProps['accent']>, string> = {
  red: 'bg-brand-red/10 text-brand-red',
  cyan: 'bg-brand-cyan/10 text-brand-cyan',
  orange: 'bg-brand-orange/10 text-brand-orange',
  green: 'bg-emerald-100 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
}

export function StatCard({ title, value, icon: Icon, hint, accent = 'red' }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', accentStyles[accent])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{title}</p>
          <p className="text-xl font-bold text-brand-dark">{value}</p>
          {hint && <p className="truncate text-xs text-slate-400">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
