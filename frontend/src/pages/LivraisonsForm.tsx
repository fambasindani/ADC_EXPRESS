import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'

interface Livreur {
  id: number
  nom: string
  postnom: string | null
  prenom: string | null
  telephone: string | null
}

interface Devise {
  code: string
  nom: string
  symbole?: string | null
}

interface FormData {
  livreurs: Livreur[]
  devises: Devise[]
}

interface ColisDispo {
  id: number
  numero_suivi: string
  nom_destinataire: string
  telephone_destinataire: string
  adresse_destinataire: string | null
  statut: string
  mode_facturation: string
  montant_transport: string
  devise_paiement: string
  montant_paye?: number
  solde?: number
  livraison_bloquee?: boolean
  agence_depot?: { code: string; nom: string } | null
  agence_destination?: { code: string; nom: string } | null
}

interface LivraisonData {
  id: number
  colis_id: number
  livreur_id: number
  adresse_livraison: string
  frais_livraison: string
  devise_code: string
  statut: string
  colis?: ColisDispo | null
}

const empty = { colis_id: '', livreur_id: '', adresse_livraison: '', frais_livraison: '', devise_code: 'CDF' }

export function LivraisonsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [livreurs, setLivreurs] = useState<Livreur[]>([])
  const [devises, setDevises] = useState<Devise[]>([])
  const [colisList, setColisList] = useState<ColisDispo[]>([])
  const [colisEdit, setColisEdit] = useState<ColisDispo | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      try {
        const [formDataRes, colisRes, livraisonRes] = await Promise.all([
          api.get<FormData>('/livraisons/form-data'),
          api.get<ColisDispo[]>('/livraisons/colis-disponibles'),
          id ? api.get<LivraisonData>(`/livraisons/${id}`) : Promise.resolve(null),
        ])
        if (!active) return
        setLivreurs(formDataRes.data.livreurs)
        setDevises(formDataRes.data.devises)
        setColisList(colisRes.data)

        if (livraisonRes) {
          const l = livraisonRes.data
          setForm({
            colis_id: String(l.colis_id),
            livreur_id: String(l.livreur_id),
            adresse_livraison: l.adresse_livraison ?? '',
            frais_livraison: l.frais_livraison ?? '',
            devise_code: l.devise_code,
          })
          if (l.colis) setColisEdit(l.colis)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Impossible de charger le formulaire.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const selected: ColisDispo | null = useMemo(() => {
    if (isEdit) return colisEdit
    return colisList.find((c) => String(c.id) === form.colis_id) ?? null
  }, [isEdit, colisEdit, colisList, form.colis_id])

  const options: ComboboxOption[] = useMemo(
    () =>
      colisList.map((c) => ({
        value: String(c.id),
        label: c.numero_suivi,
        hint: `${c.nom_destinataire} · ${c.agence_destination?.code ?? '—'} · ${c.statut}`,
      })),
    [colisList],
  )

  function choisirColis(value: string) {
    const colis = colisList.find((c) => String(c.id) === value)
    setError(null)
    setForm((f) => ({
      ...f,
      colis_id: value,
      adresse_livraison: colis?.adresse_destinataire ?? f.adresse_livraison,
      devise_code: colis?.devise_paiement ?? f.devise_code,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.colis_id) {
      setError('Sélectionnez un colis.')
      return
    }
    if (!form.livreur_id) {
      setError('Sélectionnez un livreur.')
      return
    }
    if (selected?.livraison_bloquee) {
      setError(
        `Ce colis est « payé au retrait » et n'est pas soldé. Encaissez d'abord ${formatMoney(
          selected.solde ?? 0,
          selected.devise_paiement,
        )} dans Paiements.`,
      )
      return
    }
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Affecter ce colis au livreur ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    setError(null)
    const payload = {
      colis_id: Number(form.colis_id),
      livreur_id: Number(form.livreur_id),
      adresse_livraison: form.adresse_livraison,
      frais_livraison: form.frais_livraison ? Number(form.frais_livraison) : 0,
      devise_code: form.devise_code,
    }
    try {
      if (isEdit) await api.put(`/livraisons/${id}`, payload)
      else await api.post('/livraisons', payload)
      navigate('/livraisons')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) {
        setErrors((err as { errors: Record<string, string[]> }).errors)
      }
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={isEdit ? 'Modifier la livraison' : 'Nouvelle livraison'}
        description="Affecter un colis à un livreur pour remise à domicile."
        actions={<BackButton to="/livraisons" />}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Informations de la livraison</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Spinner /> Chargement…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {errors && (
                <div className="sm:col-span-2">
                  <ErrorList errors={errors} />
                </div>
              )}

              {livreurs.length === 0 && (
                <div className="sm:col-span-2">
                  <Alert variant="info">
                    Aucun livreur actif. Créez un utilisateur avec le rôle <strong>LIVREUR</strong> pour pouvoir
                    affecter des colis.{' '}
                    <Link to="/utilisateurs/nouveau" className="font-medium underline">
                      Créer un livreur
                    </Link>
                    .
                  </Alert>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label required>Colis</Label>
                {isEdit ? (
                  <p className="font-mono text-sm font-semibold text-brand-dark">
                    {selected?.numero_suivi ?? `#${form.colis_id}`}
                  </p>
                ) : (
                  <Combobox
                    options={options}
                    value={form.colis_id}
                    onChange={choisirColis}
                    placeholder="Rechercher par n° de suivi ou destinataire…"
                    searchPlaceholder="N° suivi, nom ou téléphone…"
                    emptyText="Aucun colis livrable"
                  />
                )}
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
                  {selected.livraison_bloquee && (
                    <div className="mt-3">
                      <Alert variant="error">
                        Colis « payé au retrait » non soldé : encaissez{' '}
                        {formatMoney(selected.solde ?? 0, selected.devise_paiement)} avant l'affectation.{' '}
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
                <Label required>Livreur</Label>
                <Select
                  value={form.livreur_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, livreur_id: v }))}
                  disabled={livreurs.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={livreurs.length === 0 ? 'Aucun livreur disponible' : 'Sélectionner un livreur'} />
                  </SelectTrigger>
                  <SelectContent>
                    {livreurs.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        {`${l.prenom ?? ''} ${l.nom}`.trim()}
                        {l.telephone ? ` — ${l.telephone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label required>Devise des frais</Label>
                <Select
                  value={form.devise_code}
                  onValueChange={(v) => setForm((f) => ({ ...f, devise_code: v }))}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {devises.map((d) => (
                      <SelectItem key={d.code} value={d.code}>
                        {d.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse de livraison</Label>
                <Input
                  required
                  value={form.adresse_livraison}
                  onChange={(e) => setForm((f) => ({ ...f, adresse_livraison: e.target.value }))}
                  placeholder="Remplie depuis l'adresse du destinataire"
                />
              </div>

              <div className="space-y-2">
                <Label>Frais de livraison</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.frais_livraison}
                  onChange={(e) => setForm((f) => ({ ...f, frais_livraison: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving || !form.colis_id || !form.livreur_id}>
                  {saving && <Spinner />}
                  <Save className="h-4 w-4" /> Enregistrer
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
