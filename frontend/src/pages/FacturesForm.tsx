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
import { Skeleton } from '@/components/ui/skeleton'
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

interface FactureData {
  id: number
  colis_id: number
  montant_total: string
  devise_code: string
  colis?: { id: number; numero_suivi: string } | null
}

const empty = { colis_id: '', montant_total: '', devise_code: 'CDF' }

export function FacturesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [devises, setDevises] = useState<{ code: string; nom: string }[]>([])
  const [colisList, setColisList] = useState<Colis[]>([])
  const [colisLabel, setColisLabel] = useState('')
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    async function load() {
      try {
        const [devisesRes, factureRes] = await Promise.all([
          api.get<{ code: string; nom: string }[]>('/devises'),
          id ? api.get<{ facture: FactureData }>(`/factures/${id}`) : Promise.resolve(null),
        ])
        if (!active) return
        setDevises(devisesRes.data)

        if (factureRes) {
          // GET /factures/{id} renvoie { data: { facture, montant_paye, solde, est_payee } }
          const f = factureRes.data.facture
          setForm({
            colis_id: String(f.colis_id),
            montant_total: f.montant_total,
            devise_code: f.devise_code,
          })
          setColisLabel(f.colis?.numero_suivi ?? `Colis #${f.colis_id}`)
        } else {
          // À la création seulement : liste des colis pour le sélecteur.
          const colis = await fetchAllPages<Colis>('/colis', { sort_by: 'date_depot', sort_dir: 'desc' }, { maxRows: 2000 })
          if (active) setColisList(colis)
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Impossible de charger la facture.')
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
      setForm((f) => ({
        ...f,
        colis_id: value,
        montant_total: String(colis.montant_transport),
        devise_code: colis.devise_paiement,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger le colis.')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isEdit && !form.colis_id) {
      setError('Sélectionnez un colis.')
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
    const payload: Record<string, string | number> = {
      montant_total: Number(form.montant_total),
      devise_code: form.devise_code,
    }
    // Le colis d'une facture n'est pas modifiable après création.
    if (!isEdit) payload.colis_id = Number(form.colis_id)

    try {
      if (isEdit) await api.put(`/factures/${id}`, payload)
      else await api.post('/factures', payload)
      navigate('/factures')
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
      <PageHeader title={isEdit ? 'Modifier la facture' : 'Nouvelle facture'} actions={<BackButton to="/factures" />} />

      <Card>
        <CardHeader><CardTitle>Informations de la facture</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
              {error && <div className="sm:col-span-3"><Alert variant="error">{error}</Alert></div>}
              {errors && <div className="sm:col-span-3"><ErrorList errors={errors} /></div>}
              <div className="space-y-2">
                <Label>Colis</Label>
                {isEdit ? (
                  <Input value={colisLabel} readOnly disabled />
                ) : (
                  <Combobox
                    options={options}
                    value={form.colis_id}
                    onChange={choisirColis}
                    placeholder="N° de suivi du colis"
                    searchPlaceholder="Rechercher un n° de suivi…"
                  />
                )}
                {form.colis_id && form.montant_total && (
                  <p className="text-xs text-slate-500">
                    Montant transport : {formatMoney(form.montant_total, form.devise_code)}
                  </p>
                )}
              </div>
              <div className="space-y-2"><Label>Montant total</Label><Input required type="number" step="0.01" value={form.montant_total} onChange={(e) => setForm((f) => ({ ...f, montant_total: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select value={form.devise_code} onValueChange={(v) => setForm((f) => ({ ...f, devise_code: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{devises.map((d) => <SelectItem key={d.code} value={d.code}>{d.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-3">
                <Button type="submit" disabled={saving}>{saving && <Spinner />}<Save className="h-4 w-4" /> Enregistrer</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
