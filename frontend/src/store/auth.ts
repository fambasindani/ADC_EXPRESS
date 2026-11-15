import { create } from 'zustand'
import { api, ApiError } from '@/lib/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  token: string | null
  initialized: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadMe: () => Promise<void>
  hasPermission: (code: string) => boolean
  hasRole: (code: string) => boolean
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('adc_token'),
  initialized: false,
  loading: false,

  async login(email, password) {
    set({ loading: true })
    try {
      const res = await api.post<{ user: User; token: string }>('/login', { email, password })
      localStorage.setItem('adc_token', res.data.token)
      set({ user: res.data.user, token: res.data.token })
    } finally {
      set({ loading: false })
    }
  },

  async logout() {
    try {
      await api.post('/logout')
    } catch {
      // ignore
    }
    localStorage.removeItem('adc_token')
    set({ user: null, token: null })
  },

  async loadMe() {
    const token = get().token
    if (!token) {
      set({ initialized: true })
      return
    }
    try {
      const res = await api.get<User | { user: User }>('/me')
      // Compatibilité : l'API peut renvoyer l'utilisateur directement ou sous `data.user`.
      const user = 'user' in res.data ? res.data.user : res.data
      set({ user: user ?? null, initialized: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        set({ user: null, token: null, initialized: true })
        return
      }
      set({ initialized: true })
    }
  },

  hasPermission(code) {
    const user = get().user
    if (!user) return false
    if (user.roles?.some((r) => r.code === 'SUPER_ADMIN' || r.code === 'ADMIN')) return true
    return user.permissions?.includes(code) ?? false
  },

  hasRole(code) {
    const user = get().user
    return user?.roles?.some((r) => r.code === code) ?? false
  },
}))
