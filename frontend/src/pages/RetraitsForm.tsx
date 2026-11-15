import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { Alert, ErrorList } from '@/components/Alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'

interface ColisEligible {
  id: number
  numero_suivi: string
  nom_destinataire: string
  telephone_destinataire: string
  statut: string
  mode_facturation: string
  montant_transport: string
  devise_paiement: string
  montant_paye?: number
  solde?: number
  reglement_requis?: boolean
  agence_depot?: { code: string; nom: string } | null
  agence_destination?: { code: string; nom: string } | null
}

export function RetraitsForm() {
  const navigate = useNavigate()
  const { confirm, dialog } = useConfirm()
  const [eligibles, setEligibles] = useState<ColisEligible[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    colis_id: '',
    retire_par_nom: '',
    retire_par_telephone: '',
    type_identite: '',
    numero_identite: '',
    otp_code: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  const loadEligibles = useCallback(async () => {
    const res = await api.get<ColisEligible[]>('/retraits/eligibles')
    setEligibles(res.data)
    return res.data
  }, [])

  useEffect(() => {
    loadEligibles()
      .catch((err) => setError(err instanceof Error ? err.message : 'Impossible de charger les colis éligibles.'))
      .finally(() => setLoading(false))
  }, [loadEligibles])

  const selected = useMemo(
    () => eligibles.find((c) => String(c.id) === form.colis_id) ?? null,
    [eligibles, form.colis_id],
  )

  const options: ComboboxOption[] = useMemo(
    () =>
      eligibles.map((c) => ({
        value: String(c.id),
        label: c.numero_suivi,
        hint: `${c.nom_destinataire} · ${c.agence_destination?.code ?? '—'} · ${formatMoney(c.solde ?? Number(c.montant_transport), c.devise_paiement)}`,
      })),
    [eligibles],
  )

  function choisirColis(value: string) {
    const colis = eligibles.find((c) => String(c.id) === value)
    setError(null)
    setErrors(undefined)
    setForm((f) => ({
      ...f,
      colis_id: value,
      retire_par_nom: colis?.nom_destinataire ?? f.retire_par_nom,
      retire_par_telephone: colis?.telephone_destinataire ?? f.retire_par_telephone,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.colis_id) {
      setError('Sélectionnez un colis éligible.')
      return
    }
    if (selected?.reglement_requis) {
      setError(
        `Ce colis est « payé au retrait » et n'est pas soldé. Encaissez d'abord ${formatMoney(
          selected.solde ?? 0,
          selected.devise_paiement,
        )} dans Paiements avant de le remettre.`,
      )
      return
    }
    confirm(
      { title: 'Enregistrer ce retrait ?', description: 'Le colis sera marqué comme remis au destinataire.' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    setError(null)
    try {
      await api.post('/retraits', {
        colis_id: Number(form.colis_id),
        retire_par_nom: form.retire_par_nom,
        retire_par_telephone: form.retire_par_telephone,
        type_identite: form.type_identite || undefined,
        numero_identite: form.numero_identite || undefined,
        otp_code: form.otp_code || undefined,
      })
      navigate('/retraits')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) {
        setErrors((err as { errors: Record<string, string[]> }).errors)
      }
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.')
      // Le colis a pu être retiré entre-temps : on recharge la liste.
      loadEligibles()
        .then((list) => {
          if (!list.some((c) => String(c.id) === form.colis_id)) {
            setForm((f) => ({ ...f, colis_id: '' }))
          }
        })
        .catch(() => {})
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Nouveau retrait"
        description="Remettre un colis au destinataire ou à son mandataire."
        actions={<BackButton to="/retraits" />}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Informations du retrait</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Spinner /> Chargement des colis éligibles…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {errors && (
                <div className="sm:col-span-2">
                  <ErrorList errors={errors} />
                </div>
              )}

              {eligibles.length === 0 && (
                <div className="sm:col-span-2">
                  <Alert variant="info">
                    Aucun colis n'est éligible au retrait. Un colis doit être au statut{' '}
                    <strong>ARRIVE_AGENCE</strong> et ne pas avoir déjà été retiré.{' '}
                    <Link to="/colis" className="font-medium underline">
                      Voir les colis
                    </Link>
                    .
                  </Alert>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Colis (éligibles)</Label>
                <Combobox
                  options={options}
                  value={form.colis_id}
                  onChange={choisirColis}
                  disabled={eligibles.length === 0}
                  placeholder={eligibles.length === 0 ? 'Aucun colis éligible' : 'Rechercher par n° de suivi ou destinataire…'}
                  searchPlaceholder="N° de suivi, nom ou téléphone…"
                  emptyText="Aucun colis éligible"
                />
              </div>

              {selected && (
                <div className="rounded-lg border border-brand-border bg-brand-grayLight/60 p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-brand-dark">{selected.numero_suivi}</p>
                      <p className="text-xs text-slate-500">
                        {selected.nom_destinataire} · {selected.telephone_destinataire}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selected.agence_depot?.code ?? '—'} → {selected.agence_destination?.code ?? '—'} ·{' '}
                        {selected.mode_facturation === 'PAYE_AU_RETRAIT' ? 'Payé au retrait' : 'Payé au dépôt'}
                      </p>
                    </div>
                    <Badge className={STATUT_COLIS_STYLE[selected.statut as StatutColis] ?? ''}>{selected.statut}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <p>
                      <span className="text-slate-500">Transport : </span>
                      <span className="font-semibold">{formatMoney(selected.montant_transport, selected.devise_paiement)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Déjà payé : </span>
                      <span className="font-semibold">{formatMoney(selected.montant_paye ?? 0, selected.devise_paiement)}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Solde : </span>
                      <span className="font-semibold">
                        {formatMoney(selected.solde ?? Number(selected.montant_transport), selected.devise_paiement)}
                      </span>
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    ID colis : <span className="font-mono font-semibold">{selected.id}</span>
                  </p>
                  {selected.reglement_requis && (
                    <div className="mt-3">
                      <Alert variant="error">
                        Colis « payé au retrait » non soldé : encaissez{' '}
                        {formatMoney(selected.solde ?? 0, selected.devise_paiement)} avant le retrait.{' '}
                        <Link to="/paiements/nouveau" className="font-medium underline">
                          Enregistrer un paiement
                        </Link>
                        .
                      </Alert>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Retiré par</Label>
                <Input
                  required
                  value={form.retire_par_nom}
                  onChange={(e) => setForm((f) => ({ ...f, retire_par_nom: e.target.value }))}
                  placeholder="Nom du destinataire ou du mandataire"
                />
              </div>

              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  required
                  value={form.retire_par_telephone}
                  onChange={(e) => setForm((f) => ({ ...f, retire_par_telephone: e.target.value }))}
                  placeholder="+243 …"
                />
              </div>

              <div className="space-y-2">
                <Label>Type de pièce (optionnel)</Label>
                <Input
                  value={form.type_identite}
                  onChange={(e) => setForm((f) => ({ ...f, type_identite: e.target.value }))}
                  placeholder="Carte d'identité, passeport…"
                />
              </div>

              <div className="space-y-2">
                <Label>N° de pièce (optionnel)</Label>
                <Input
                  value={form.numero_identite}
                  onChange={(e) => setForm((f) => ({ ...f, numero_identite: e.target.value }))}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Code OTP (optionnel)</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={form.otp_code}
                  onChange={(e) => setForm((f) => ({ ...f, otp_code: e.target.value.replace(/\D/g, '') }))}
                  placeholder="6 chiffres — généré sur la page OTP"
                />
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving || !form.colis_id}>
                  {saving && <Spinner />}
                  <Save className="h-4 w-4" /> Enregistrer le retrait
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
