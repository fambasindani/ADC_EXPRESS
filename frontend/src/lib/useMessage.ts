import { useCallback, useState } from 'react'
import type { MessageVariant } from '@/components/MessageDialog'

interface ShowOptions {
  title?: string
  variant?: MessageVariant
}

/**
 * Gère l'affichage d'une fenêtre modale d'information (remplace window.alert).
 */
export function useMessage() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState<string | undefined>(undefined)
  const [variant, setVariant] = useState<MessageVariant>('error')

  const show = useCallback((msg: string, options?: ShowOptions) => {
    setMessage(msg)
    setTitle(options?.title)
    setVariant(options?.variant ?? 'error')
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  return {
    show,
    dialog: { open, message, title, variant, onClose: close },
  }
}
