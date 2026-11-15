import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(nom?: string | null, prenom?: string | null): string {
  const n = (nom ?? '').trim()
  const p = (prenom ?? '').trim()
  const initials = `${p.charAt(0) ?? ''}${n.charAt(0) ?? ''}`
  return initials.toUpperCase() || '?'
}
