import { createPortal } from 'react-dom'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type MessageVariant = 'error' | 'success' | 'info'

export interface MessageDialogProps {
  open: boolean
  title?: string
  message: string
  variant?: MessageVariant
  onClose: () => void
}

const icons = {
  error: XCircle,
  success: CheckCircle2,
  info: Info,
}

const colors = {
  error: 'bg-red-100 text-red-600',
  success: 'bg-emerald-100 text-emerald-600',
  info: 'bg-brand-cyanLight text-brand-cyan',
}

/**
 * Fenêtre modale d'information / d'erreur (remplace window.alert).
 */
export function MessageDialog({ open, title, message, variant = 'error', onClose }: MessageDialogProps) {
  if (!open) return null
  const Icon = icons[variant]

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${colors[variant]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 pt-1">
              {title && <h3 className="text-base font-semibold text-brand-dark">{title}</h3>}
              <p className="mt-1 text-sm text-slate-600">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end border-t border-brand-border bg-brand-grayLight/50 px-6 py-4">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
