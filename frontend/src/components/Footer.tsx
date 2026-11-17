import { Headset, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'

const VERSION = 'v2.6 RDC'

/**
 * Pied de page commun à toutes les pages de l'application.
 */
export function Footer() {
  return (
    <footer className="shrink-0 border-t border-brand-border bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5 text-[11px] text-slate-500 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Logo size={16} withLetters={false} />
          <span className="font-semibold text-brand-dark">ADC Express RDC</span>
          <span className="hidden text-slate-300 lg:inline">·</span>
          <span className="hidden lg:inline">Gestion logistique des colis</span>
        </div>

        <div className="flex items-center gap-3 whitespace-nowrap">
          <a
            href="tel:+243822353038"
            className="inline-flex items-center gap-1 transition-colors hover:text-brand-red"
          >
            <Headset className="h-3.5 w-3.5 text-brand-orange" />
            +243 822 353 038
          </a>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span className="hidden items-center gap-1 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Session sécurisée
          </span>
          <span className="text-slate-300">|</span>
          <span className="rounded bg-brand-grayLight px-1.5 py-0.5 font-semibold text-brand-dark">
            {VERSION}
          </span>
        </div>

        <p className="whitespace-nowrap text-[11px] text-slate-400">
          © {new Date().getFullYear()} ADC Express
          <span className="hidden sm:inline"> — Tous droits réservés</span>
        </p>
      </div>
    </footer>
  )
}
