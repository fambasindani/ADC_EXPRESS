import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-grayLight px-6 text-center">
      <p className="text-7xl font-black text-brand-red">404</p>
      <h1 className="mt-4 text-2xl font-bold text-brand-dark">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Retour au tableau de bord</Link>
      </Button>
    </div>
  )
}
