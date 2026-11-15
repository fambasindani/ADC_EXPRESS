import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'success' | 'error' | 'info'
  children: React.ReactNode
  className?: string
}

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-700',
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: AlertCircle,
}

export function Alert({ variant = 'info', children, className }: AlertProps) {
  const Icon = icons[variant]
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', styles[variant], className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function ErrorList({ errors }: { errors?: Record<string, string[]> }) {
  if (!errors) return null
  const messages = Object.values(errors).flat()
  if (messages.length === 0) return null
  return (
    <Alert variant="error">
      <ul className="list-inside list-disc space-y-0.5">
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </Alert>
  )
}
