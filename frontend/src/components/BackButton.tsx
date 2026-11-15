import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function BackButton({ to }: { to?: string }) {
  const navigate = useNavigate()
  return (
    <Button variant="outline" onClick={() => (to ? navigate(to) : navigate(-1))}>
      <ArrowLeft className="h-4 w-4" /> Retour
    </Button>
  )
}
