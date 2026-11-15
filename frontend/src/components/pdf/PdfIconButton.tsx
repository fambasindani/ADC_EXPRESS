import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface PdfIconButtonProps {
  onDownload: () => Promise<void>
  title?: string
}

export function PdfIconButton({ onDownload, title = 'Télécharger le PDF' }: PdfIconButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await onDownload()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-brand-orange transition-colors hover:bg-brand-grayLight"
    >
      {loading ? <Spinner className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
    </button>
  )
}
