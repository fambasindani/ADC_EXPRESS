import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { IDLE_TIMEOUT_MINUTES } from '@/lib/constants'
import { useAuth } from '@/store/auth'

const TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000
/** Intervalle minimal entre deux appels de maintien de session. */
const HEARTBEAT_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'wheel',
  'touchstart',
  'pointerdown',
] as const

/**
 * Déconnecte l'utilisateur après une période d'inactivité.
 * Monté dans AppLayout : couvre toutes les pages authentifiées.
 */
export function IdleTimeout() {
  const navigate = useNavigate()
  const logout = useAuth((s) => s.logout)
  const lastActivity = useRef(Date.now())
  const lastHeartbeat = useRef(Date.now())
  const timer = useRef<number | null>(null)
  const closing = useRef(false)

  useEffect(() => {
    function clearTimer() {
      if (timer.current !== null) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
    }

    async function expire() {
      if (closing.current) return
      closing.current = true
      clearTimer()
      sessionStorage.setItem('adc_session_expired', '1')
      try {
        await logout()
      } finally {
        navigate('/login', { replace: true })
      }
    }

    function schedule() {
      clearTimer()
      const remaining = TIMEOUT_MS - (Date.now() - lastActivity.current)
      timer.current = window.setTimeout(expire, Math.max(remaining, 0))
    }

    function onActivity() {
      lastActivity.current = Date.now()
      schedule()

      // Maintient le jeton actif côté API pendant une utilisation réelle,
      // sans multiplier les requêtes (une toutes les 5 minutes au maximum).
      if (Date.now() - lastHeartbeat.current >= HEARTBEAT_MS) {
        lastHeartbeat.current = Date.now()
        api.get('/me').catch(() => {})
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      // Les minuteurs des onglets en arrière-plan peuvent être ralentis :
      // on revérifie le délai réel au retour sur l'onglet.
      if (Date.now() - lastActivity.current >= TIMEOUT_MS) {
        expire()
      } else {
        schedule()
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibilityChange)
    schedule()

    return () => {
      clearTimer()
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [logout, navigate])

  return null
}
