import { pdf, type DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

export async function downloadPdf(element: ReactElement<DocumentProps>, filename: string) {
  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
