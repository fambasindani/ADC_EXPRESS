import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, Building2, ShieldCheck, Headset, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Footer } from '@/components/Footer'
import { IDLE_TIMEOUT_MINUTES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Alert } from '@/components/Alert'
import { useAuth } from '@/store/auth'

const AGENCES = [
  'KIN-01 — Kinshasa Gombe (Siège National)',
  'KIN-02 — Kinshasa Limete (Hub Cargo)',
  'LUB-01 — Lubumbashi Centre',
  'GOM-01 — Goma Himbi',
  'MAT-01 — Matadi Port',
]

export function Login() {
  const navigate = useNavigate()
  const { login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agence, setAgence] = useState(AGENCES[0])
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired] = useState(() => sessionStorage.getItem('adc_session_expired') === '1')

  useEffect(() => {
    sessionStorage.removeItem('adc_session_expired')
  }, [])

  async function doLogin(em: string, pw: string) {
    setError(null)
    try {
      await login(em, pw)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await doLogin(email, password)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-brand-dark from-45% to-brand-grayLight to-45%">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b-4 border-brand-orange bg-brand-dark px-6 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo size={42} />
          <div className="leading-tight">
            <p className="text-xl font-black text-white">
              ADC <span className="text-brand-orange">EXPRESS</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[1.3px] text-brand-cyan">Portail Logistique RDC</p>
          </div>
        </div>
        <div className="hidden items-center gap-3 text-sm text-white sm:flex">
          <span>
            <Headset className="mr-1 inline h-4 w-4 text-brand-orange" />
            Support Réseau : +243 822 353 038
          </span>
          <span className="rounded bg-brand-red px-2 py-1 text-xs font-bold">v2.6 RDC</span>
        </div>
      </header>

      {/* Login content */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="h-1.5 bg-gradient-to-r from-brand-cyan via-brand-red to-brand-orange" />

          <div className="grid md:grid-cols-5">
            {/* Bannière gauche */}
            <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-dark to-[#2b2b2b] p-8 text-white md:col-span-2">
              <div className="absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-brand-orange/10" />
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded bg-brand-orange px-3 py-1.5 text-xs font-bold text-brand-dark">
                  <ShieldCheck className="h-4 w-4" /> ACCÈS AGENT & ADMIN
                </span>
                <h3 className="mb-3 text-2xl font-extrabold leading-tight">
                  Gestion Centrale des Colis & Expéditions
                </h3>
                <p className="text-sm text-white/70">
                  Connectez-vous à votre espace agence pour enregistrer les dépôts, suivre les convois
                  inter-provinces et gérer la facturation multi-devises (USD / CDF).
                </p>
              </div>

              <div className="space-y-2 border-t border-white/20 pt-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-cyan" /> Couverture 26 Provinces RDC
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-orange" /> Traçabilité OTP & Bordereaux QR
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand-red" /> Audit RBAC & Sécurité Caisse
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <div className="p-8 md:col-span-3">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h4 className="mb-1 text-lg font-bold text-brand-dark">Connexion au Système</h4>
                  <p className="text-sm text-slate-500">
                    Identifiez-vous avec vos accès <code className="rounded bg-slate-100 px-1">users</code>
                  </p>
                </div>
                <Logo size={36} />
              </div>

              {sessionExpired && (
                <Alert variant="info">
                  Votre session a expiré après {IDLE_TIMEOUT_MINUTES} minutes d'inactivité. Veuillez vous reconnecter.
                </Alert>
              )}

              {error && <Alert variant="error">{error}</Alert>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Adresse Email Professionnelle</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      required
                      placeholder="agent@adcexpress.cd"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Mot de passe</Label>
                    <button type="button" className="text-xs font-semibold text-brand-red" onClick={() => setError('Veuillez contacter l\'administrateur Siège Gombe pour réinitialiser votre mot de passe.')}>
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Agence d'affectation</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select
                      className="h-10 w-full rounded-lg border border-brand-border bg-white pl-9 pr-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-brand-red/40"
                      value={agence}
                      onChange={(e) => setAgence(e.target.value)}
                    >
                      {AGENCES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-brand-border text-brand-red" />
                    Maintenir ma session active
                  </label>
                  <span className="inline-flex items-center gap-1 rounded border bg-slate-50 px-2 py-1 text-xs text-slate-600">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" /> SSL / Audit Actif
                  </span>
                </div>

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="w-full bg-brand-red py-2 font-bold hover:bg-brand-redDark">
                    {loading && <Spinner />} Se Connecter à l'Espace Admin
                  </Button>
                </div>
              </form>

              <div className="mt-6 border-t pt-3 text-center text-xs text-slate-500">
                Toutes les actions sont enregistrées dans{' '}
                <code className="rounded bg-slate-100 px-1">journaux_activites</code> conformément à la
                politique de sécurité ADC RDC.
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
