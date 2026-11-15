import { useCallback, useState } from 'react'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<Omit<ConfirmOptions, 'title'> & { title: string }>({ title: '' })
  const [action, setAction] = useState<() => void | Promise<void>>(() => {})

  const confirm = useCallback((opts: ConfirmOptions, onConfirm: () => void | Promise<void>) => {
    setOptions({
      title: opts.title,
      description: opts.description,
      confirmLabel: opts.confirmLabel,
      cancelLabel: opts.cancelLabel,
      variant: opts.variant,
    })
    setAction(() => onConfirm)
    setOpen(true)
  }, [])

  const handleConfirm = useCallback(async () => {
    setLoading(true)
    try {
      await action()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }, [action])

  const onOpenChange = useCallback(
    (o: boolean) => {
      if (!loading) setOpen(o)
    },
    [loading],
  )

  return {
    confirm,
    dialog: {
      open,
      loading,
      onConfirm: handleConfirm,
      onOpenChange,
      ...options,
    },
  }
}
