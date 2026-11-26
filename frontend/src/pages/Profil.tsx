import { useState } from 'react'
import { Save, KeyRound, User, Building2, ShieldCheck, Phone, Mail } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const empty = { current_password: '', password: '', password_confirmation: '' }

export function Profil() {
  const user = useAuth((s) => s.user)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.post('/me/mot-de-passe', form)
      setMessage({ text: 'Mot de passe modifié avec succès.', variant: 'success' })
      setForm(empty)
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Erreur.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Mon profil" description="Vos informations de compte et la gestion de votre mot de passe." />

      {message && <Alert variant={message.variant}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-brand-red" /> Informations du compte
            </CardTitle>
            <CardDescription>Ces informations sont gérées par l'administration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-red/10 text-lg font-bold text-brand-red">
                {user?.nom_complet?.split(' ').map((m) => m[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-brand-dark">{user?.nom_complet}</p>
                <p className="text-sm text-slate-500">{user?.roles?.map((r) => r.nom).join(', ')}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-brand-border pt-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-4 w-4 text-slate-400" /> {user?.email ?? '—'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" /> {user?.telephone ?? 'Non renseigné'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="h-4 w-4 text-slate-400" />
                {user?.agence ? `${user.agence.nom} (${user.agence.code})` : 'Aucune agence'}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <Badge variant="outline">{user?.statut}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-brand-red" /> Changer le mot de passe
            </CardTitle>
            <CardDescription>Choisissez un nouveau mot de passe (6 caractères minimum).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label required>Mot de passe actuel</Label>
                <Input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.current_password}
                  onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label required>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label required>Confirmer le nouveau mot de passe</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving && <Spinner />}
                  <Save className="h-4 w-4" /> Enregistrer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
