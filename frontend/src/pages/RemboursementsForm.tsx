import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetchAll'
import { formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { Alert, ErrorList } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'

interface RemboursementData {
  id: number
  paiement_id: number
  montant: string
  motif: string
  statut: string
  paiement?: {
    id: number
    reference_paiement: string
    montant: string
    devise_code: string
    colis?: { numero_suivi: string } | null
  } | null
}

interface PaiementOption {
  id: number
  reference_paiement: string
  montant: string
  devise_code: string
  colis?: { numero_suivi: string } | null
}

const empty = { paiement_id: '', montant: '', motif: '' }

export function RemboursementsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [paiements, setPaiements] = useState<PaiementOption[]>([])
  const [paiementLabel, setPaiementLabel] = useState('')
  const [form, setForm] = useState(empty)
  const [statut, setStatut] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    async function load() {
      try {
        if (id) {
          const res = await api.get<RemboursementData>(`/remboursements/${id}`)
          if (!active) return
          const r = res.data
          setStatut(r.statut)
          setForm({ paiement_id: String(r.paiement_id), montant: r.montant, motif: r.motif })
          setPaiementLabel(
            r.paiement
              ? `${r.paiement.reference_paiement} · ${r.paiement.colis?.numero_suivi ?? '—'} · ${formatMoney(r.paiement.montant, r.paiement.devise_code)}`
              : `Paiement #${r.paiement_id}`,
          )
        } else {
          // À la création : uniquement les paiements validés, remboursables.
          const list = await fetchAllPages<PaiementOption>('/paiements', { statut: 'VALIDE', sort_by: 'date_paiement', sort_dir: 'desc' }, { maxRows: 2000 })
          if (active) setPaiements(list)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Impossible de charger le remboursement.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const options: ComboboxOption[] = useMemo(
    () =>
      paiements.map((p) => ({
        value: String(p.id),
        label: p.reference_paiement,
        hint: `${p.colis?.numero_suivi ?? '—'} · ${formatMoney(p.montant, p.devise_code)}`,
      })),
    [paiements],
  )

  function choisirPaiement(value: string) {
    const p = paiements.find((x) => String(x.id) === value)
    setError(null)
    setForm((f) => ({ ...f, paiement_id: value, montant: p ? p.montant : f.montant }))
  }

  // Seules les demandes en statut DEMANDE sont modifiables (règle API).
  const bloque = isEdit && statut !== null && statut !== 'DEMANDE'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bloque) return
    if (!form.paiement_id) {
      setError('Sélectionnez un paiement.')
      return
    }
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Ajouter cet enregistrement ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    setErrors(undefined)
    // À la modification, seuls le montant et le motif sont acceptés.
    const payload = isEdit
      ? { montant: Number(form.montant), motif: form.motif }
      : { paiement_id: Number(form.paiement_id), montant: Number(form.montant), motif: form.motif }
    try {
      if (isEdit) await api.put(`/remboursements/${id}`, payload)
      else await api.post('/remboursements', payload)
      navigate('/remboursements')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) {
        setErrors((err as { errors: Record<string, string[]> }).errors)
      } else {
        setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader title={isEdit ? 'Modifier le remboursement' : 'Nouveau remboursement'} actions={<BackButton to="/remboursements" />} />

      <Card>
        <CardHeader><CardTitle>Informations du remboursement</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Spinner /> Chargement…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
              {error && <div className="sm:col-span-3"><Alert variant="error">{error}</Alert></div>}
              {errors && <div className="sm:col-span-3"><ErrorList errors={errors} /></div>}
              {bloque && (
                <div className="sm:col-span-3">
                  <Alert variant="info">
                    Ce remboursement est en statut <strong>{statut}</strong> : il ne peut plus être modifié.
                  </Alert>
                </div>
              )}
              <div className="space-y-2 sm:col-span-3">
                <Label>Paiement</Label>
                {isEdit ? (
                  <Input value={paiementLabel} readOnly disabled />
                ) : (
                  <Combobox
                    options={options}
                    value={form.paiement_id}
                    onChange={choisirPaiement}
                    placeholder="Rechercher un paiement validé…"
                    searchPlaceholder="Référence, colis…"
                    emptyText="Aucun paiement remboursable"
                  />
                )}
              </div>
              <div className="space-y-2"><Label>Montant</Label><Input required type="number" step="0.01" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} disabled={bloque} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Motif</Label><Input required value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} disabled={bloque} /></div>
              <div className="flex justify-end gap-2 sm:col-span-3">
                <Button type="submit" disabled={saving || bloque}>{saving && <Spinner />}<Save className="h-4 w-4" /> Enregistrer</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
