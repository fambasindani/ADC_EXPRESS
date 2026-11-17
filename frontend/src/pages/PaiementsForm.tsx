import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetchAll'
import { formatMoney } from '@/lib/format'
import { MOMENTS_PAIEMENT, STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { Alert, ErrorList } from '@/components/Alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

interface PaiementData {
  id: number
  colis_id: number
  mode_paiement_id: number
  montant: string
  devise_code: string
  moment_paiement: string
  statut: string
  reference_externe: string | null
  observations: string | null
}

const empty = {
  colis_id: '',
  montant: '',
  devise_code: 'CDF',
  mode_paiement_id: '',
  moment_paiement: 'DEPOT',
  reference_externe: '',
  observations: '',
}

export function PaiementsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [modes, setModes] = useState<{ id: number; code: string; libelle: string }[]>([])
  const [devises, setDevises] = useState<{ code: string; nom: string }[]>([])
  const [colisList, setColisList] = useState<Colis[]>([])
  const [selected, setSelected] = useState<Colis | null>(null)
  const [loadingColis, setLoadingColis] = useState(true)
  const [form, setForm] = useState(empty)
  const [statutPaiement, setStatutPaiement] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    async function load() {
      try {
        const ref = await api.get<{
          modes_paiement: { id: number; code: string; libelle: string }[]
          devises: { code: string; nom: string }[]
        }>('/paiements/form-data')
        setModes(ref.data.modes_paiement)
        setDevises(ref.data.devises)

        // La liste complète des colis n'est utile qu'à la création :
        // en modification, le colis du paiement est chargé directement.
        if (!id) {
          const colis = await fetchAllPages<Colis>('/colis', { sort_by: 'date_depot', sort_dir: 'desc' }, { maxRows: 2000 })
          setColisList(colis)
        }

        // Espèces par défaut à la création (mode le plus courant).
        if (!id) {
          const especes = ref.data.modes_paiement.find((x) => x.code === 'ESPECES')
          if (especes) setForm((f) => (f.mode_paiement_id ? f : { ...f, mode_paiement_id: String(especes.id) }))
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de charger les données du paiement.')
      } finally {
        setLoadingColis(false)
      }
    }

    load()
  }, [id])

  useEffect(() => {
    if (!id) return
    api.get<PaiementData>(`/paiements/${id}`).then((res) => {
      const p = res.data
      setStatutPaiement(p.statut)
      setForm({
        colis_id: String(p.colis_id),
        montant: p.montant,
        devise_code: p.devise_code,
        mode_paiement_id: String(p.mode_paiement_id),
        moment_paiement: p.moment_paiement,
        reference_externe: p.reference_externe ?? '',
        observations: p.observations ?? '',
      })
      // Récapitulatif du colis, sans écraser les valeurs du paiement existant.
      api.get<Colis>(`/colis/${p.colis_id}`).then((c) => setSelected(c.data)).catch(() => {})
    })
  }, [id])

  const options: ComboboxOption[] = useMemo(
    () =>
      colisList.map((c) => ({
        value: String(c.id),
        label: c.numero_suivi,
        hint: `${c.nom_destinataire} · ${c.statut}`,
      })),
    [colisList],
  )

  async function choisirColis(value: string) {
    setForm((f) => ({ ...f, colis_id: value }))
    setError(null)
    try {
      const res = await api.get<Colis>(`/colis/${value}`)
      const colis = res.data
      setSelected(colis)
      const solde = colis.solde ?? Number(colis.montant_transport)
      setForm((f) => ({
        ...f,
        colis_id: value,
        devise_code: colis.devise_paiement,
        montant: solde > 0 ? String(solde) : '',
        moment_paiement: colis.mode_facturation === 'PAYE_AU_RETRAIT' ? 'RETRAIT' : 'DEPOT',
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger le colis.')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.colis_id) {
      setError('Sélectionnez un colis.')
      return
    }
    if (!form.mode_paiement_id) {
      setError('Sélectionnez un mode de paiement.')
      return
    }
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Encaisser ce paiement ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    setError(null)
    const payload = isEdit
      ? {
          montant: Number(form.montant),
          reference_externe: form.reference_externe || null,
          observations: form.observations || null,
        }
      : {
          colis_id: Number(form.colis_id),
          montant: Number(form.montant),
          devise_code: form.devise_code,
          mode_paiement_id: Number(form.mode_paiement_id),
          moment_paiement: form.moment_paiement,
          reference_externe: form.reference_externe || null,
          observations: form.observations || null,
        }
    try {
      if (isEdit) await api.put(`/paiements/${id}`, payload)
      else await api.post('/paiements', payload)
      navigate('/paiements')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) {
        setErrors((err as { errors: Record<string, string[]> }).errors)
      }
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  const solde = selected?.solde ?? (selected ? Number(selected.montant_transport) : 0)
  const dejaPaye = selected?.montant_paye ?? 0
  const dejaSolde = selected ? solde <= 0 : false
  // Un paiement validé ne peut plus être modifié financièrement (règle API).
  const paiementValide = statutPaiement === 'VALIDE'

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={isEdit ? 'Modifier le paiement' : 'Nouvel encaissement'}
        description="Enregistrer un paiement au dépôt ou au retrait."
        actions={<BackButton to="/paiements" />}
      />

      {error && <Alert variant="error">{error}</Alert>}
      {isEdit && paiementValide && (
        <Alert variant="info">
          Ce paiement est validé : seuls la référence externe et les observations sont modifiables.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations du paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {errors && (
              <div className="sm:col-span-2">
                <ErrorList errors={errors} />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label required>Colis</Label>
              <Combobox
                options={options}
                value={form.colis_id}
                onChange={choisirColis}
                disabled={loadingColis || isEdit}
                placeholder={loadingColis ? 'Chargement des colis…' : 'Rechercher par n° de suivi ou destinataire…'}
                searchPlaceholder="N° suivi, nom ou téléphone…"
                emptyText="Aucun colis trouvé"
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
                    <span className="font-semibold">{formatMoney(dejaPaye, selected.devise_paiement)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Solde : </span>
                    <span className="font-semibold">{formatMoney(solde, selected.devise_paiement)}</span>
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  ID colis : <span className="font-mono font-semibold">{selected.id}</span>
                </p>
                {dejaSolde && (
                  <p className="mt-2 text-sm font-medium text-emerald-700">
                    Ce colis est déjà entièrement payé.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Montant</Label>
              <Input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.montant}
                onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))}
                disabled={paiementValide}
              />
              {selected && (
                <p className="text-xs text-slate-500">Solde restant à encaisser : {formatMoney(solde, selected.devise_paiement)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label required>Devise</Label>
              <Select
                value={form.devise_code}
                onValueChange={(v) => setForm((f) => ({ ...f, devise_code: v }))}
                disabled={Boolean(selected)}
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
              <p className="text-xs text-slate-500">La devise doit être celle du colis (pré-remplie).</p>
            </div>

            <div className="space-y-2">
              <Label required>Mode de paiement</Label>
              <Select
                value={form.mode_paiement_id}
                onValueChange={(v) => setForm((f) => ({ ...f, mode_paiement_id: v }))}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label required>Moment</Label>
              <Select
                value={form.moment_paiement}
                onValueChange={(v) => setForm((f) => ({ ...f, moment_paiement: v }))}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOMENTS_PAIEMENT.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Référence externe</Label>
              <Input
                value={form.reference_externe}
                onChange={(e) => setForm((f) => ({ ...f, reference_externe: e.target.value }))}
                placeholder="N° de transaction Mobile Money, bordereau…"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Observations</Label>
              <Textarea
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                placeholder="Remarques (optionnel)"
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />}
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
