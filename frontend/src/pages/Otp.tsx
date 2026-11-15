import { useEffect, useMemo, useState } from 'react'
import { Copy, KeyRound, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetchAll'
import { formatMoney } from '@/lib/format'
import { STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/Alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Colis } from '@/types'

const USAGES = ['RETRAIT', 'LIVRAISON', 'SUIVI']

const USAGE_LABEL: Record<string, string> = {
  RETRAIT: 'Retrait au guichet',
  LIVRAISON: 'Livraison à domicile',
  SUIVI: 'Suivi / information client',
}

interface OtpGenere {
  code: string
  expire_at: string
  telephone: string
}

export function Otp() {
  const [colisList, setColisList] = useState<Colis[]>([])
  const [loadingColis, setLoadingColis] = useState(true)

  const [colisId, setColisId] = useState('')
  const [usage, setUsage] = useState('RETRAIT')
  const [telephone, setTelephone] = useState('')
  const [code, setCode] = useState('')
  const [otp, setOtp] = useState<OtpGenere | null>(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [variant, setVariant] = useState<'success' | 'error'>('success')

  useEffect(() => {
    let active = true
    fetchAllPages<Colis>('/colis', { sort_by: 'date_depot', sort_dir: 'desc' }, { maxRows: 2000 })
      .then((rows) => {
        if (active) setColisList(rows)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingColis(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selected = useMemo(
    () => colisList.find((c) => String(c.id) === colisId) ?? null,
    [colisList, colisId],
  )

  const options: ComboboxOption[] = colisList.map((c) => ({
    value: String(c.id),
    label: c.numero_suivi,
    hint: `${c.nom_destinataire} · ID ${c.id}`,
  }))

  function choisirColis(value: string) {
    setColisId(value)
    setOtp(null)
    setCode('')
    setMessage(null)
    const colis = colisList.find((c) => String(c.id) === value)
    if (colis?.telephone_destinataire) setTelephone(colis.telephone_destinataire)
  }

  async function generer() {
    if (!colisId) {
      setVariant('error')
      setMessage('Sélectionnez d’abord un colis.')
      return
    }
    setLoading(true)
    setMessage(null)
    setOtp(null)
    try {
      const res = await api.post<OtpGenere>('/otp/generer', {
        colis_id: Number(colisId),
        usage_otp: usage,
        telephone,
      })
      setOtp(res.data)
      setVariant('success')
      setMessage('Code OTP généré.')
    } catch (e) {
      setVariant('error')
      setMessage(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setLoading(false)
    }
  }

  async function verifier() {
    setLoading(true)
    setMessage(null)
    try {
      await api.post('/otp/verifier', { colis_id: Number(colisId), usage_otp: usage, code })
      setVariant('success')
      setMessage('Code OTP vérifié et consommé avec succès.')
      setOtp(null)
    } catch (e) {
      setVariant('error')
      setMessage(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setLoading(false)
    }
  }

  async function copier() {
    if (!otp) return
    try {
      await navigator.clipboard.writeText(otp.code)
      setVariant('success')
      setMessage('Code copié dans le presse-papiers.')
    } catch {
      setVariant('error')
      setMessage('Copie impossible : notez le code manuellement.')
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Codes OTP"
        description="Générer et vérifier les codes de sécurité à 6 chiffres (retrait, livraison, suivi)."
      />

      <Alert variant="info">
        Aucun SMS/WhatsApp n’est encore envoyé : le code s’affiche directement ici après génération (mode
        démonstration). Un code est <strong>valable 10 minutes</strong> et <strong>à usage unique</strong>.
      </Alert>

      {message && <Alert variant={variant}>{message}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-brand-red" /> Colis concerné
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rechercher un colis</Label>
              <Combobox
                options={options}
                value={colisId}
                onChange={choisirColis}
                disabled={loadingColis}
                placeholder={loadingColis ? 'Chargement des colis…' : 'Numéro de suivi ou destinataire…'}
                searchPlaceholder="N° suivi, nom ou téléphone…"
                emptyText="Aucun colis trouvé"
              />
              <p className="text-xs text-slate-500">
                L’API attend l’<strong>ID numérique</strong> du colis (visible dans l’URL
                <span className="font-mono"> /colis/&lt;id&gt;</span>), pas le numéro de suivi.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Usage du code</Label>
              <Select value={usage} onValueChange={setUsage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USAGES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {USAGE_LABEL[u] ?? u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selected && (
            <div className="rounded-lg border border-brand-border bg-brand-grayLight/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-brand-dark">{selected.numero_suivi}</p>
                  <p className="text-xs text-slate-500">
                    {selected.nom_destinataire} · {selected.telephone_destinataire}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={STATUT_COLIS_STYLE[selected.statut as StatutColis] ?? ''}>
                    {selected.statut}
                  </Badge>
                  <span className="text-sm font-semibold">
                    {formatMoney(selected.montant_transport, selected.devise_paiement)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                ID colis : <span className="font-mono font-semibold">{selected.id}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyRound className="h-4 w-4 text-brand-red" /> Générer un code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                required
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+243 …"
              />
              <p className="text-xs text-slate-500">
                Pré-rempli avec le téléphone du destinataire ; modifiable si le code est destiné à un tiers.
              </p>
            </div>
            <Button onClick={generer} disabled={loading || !colisId} className="w-full">
              {loading && <Spinner />} Générer
            </Button>

            {otp && (
              <div className="rounded-lg bg-brand-grayLight p-4 text-center">
                <p className="text-xs text-slate-500">Code généré — {USAGE_LABEL[usage] ?? usage}</p>
                <p className="font-mono text-3xl font-bold tracking-widest text-brand-red">{otp.code}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Expire le {new Date(otp.expire_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ·
                  téléphone {otp.telephone}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={copier}>
                    <Copy className="h-4 w-4" /> Copier
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCode(otp.code)
                      setVariant('success')
                      setMessage('Code reporté dans le formulaire de vérification.')
                    }}
                  >
                    Utiliser pour vérifier
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <KeyRound className="h-4 w-4 text-brand-cyan" /> Vérifier un code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Code (6 chiffres)</Label>
              <Input
                maxLength={6}
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="font-mono text-lg tracking-widest"
                placeholder="000000"
              />
            </div>
            <Button onClick={verifier} disabled={loading || !colisId || code.length !== 6} className="w-full">
              {loading && <Spinner />} Vérifier
            </Button>
            <p className="text-xs text-slate-500">
              La vérification <strong>consomme</strong> le code. Pour valider un retrait ou une livraison réels, saisissez
              plutôt le code directement dans les formulaires Retrait / Livraison.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
