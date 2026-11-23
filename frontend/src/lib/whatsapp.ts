import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/** Repli si l'API n'est pas joignable (doit rester aligné avec le paramètre `whatsapp_numero`). */
export const WHATSAPP_NUMERO_DEFAUT = '+243898596501'

export interface WhatsAppInfos {
  numero: string
  suivi_base: string
}

/** Normalise un téléphone (DRC) en format international pour wa.me : "243xxxxxxxxx". */
function normaliser(numero: string): string {
  const n = numero.replace(/\D/g, '')
  if (n.startsWith('00')) return n.slice(2)
  if (n.startsWith('0')) return '243' + n.slice(1)
  return n
}

/**
 * Construit une URL click-to-chat wa.me. Si le téléphone est vide, le numéro
 * configuré est utilisé en repli.
 */
export function whatsappLien(telephone: string, message: string, numeroFallback = WHATSAPP_NUMERO_DEFAUT): string {
  const dest = normaliser(telephone) || normaliser(numeroFallback)
  return `https://wa.me/${dest}?text=${encodeURIComponent(message)}`
}

/**
 * Numéro WhatsApp d'envoi + base de l'URL publique de suivi, lus depuis l'API.
 */
export function useWhatsappInfos(): WhatsAppInfos {
  const [infos, setInfos] = useState<WhatsAppInfos>({
    numero: WHATSAPP_NUMERO_DEFAUT,
    suivi_base: '',
  })

  useEffect(() => {
    api
      .get<WhatsAppInfos>('/whatsapp/numero')
      .then((r) => setInfos({ numero: r.data.numero || WHATSAPP_NUMERO_DEFAUT, suivi_base: r.data.suivi_base ?? '' }))
      .catch(() => {})
  }, [])

  return infos
}
