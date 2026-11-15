import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TarifData {
  id: number
  agence_origine_id: number | null
  agence_destination_id: number | null
  service_id: number
  devise_code: string
  prix_base: string
  prix_kg: string
  frais_supplementaires: string
  date_debut: string
}

const empty = { agence_origine_id: '', agence_destination_id: '', service_id: '', devise_code: 'USD', prix_base: '', prix_kg: '', frais_supplementaires: '', date_debut: '' }

export function TarifsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [agences, setAgences] = useState<{ id: number; nom: string }[]>([])
  const [services, setServices] = useState<{ id: number; libelle: string }[]>([])
  const [devises, setDevises] = useState<{ code: string; nom: string }[]>([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<{ id: number; nom: string }[]>('/agences'),
      api.get<{ id: number; libelle: string }[]>('/services-transport'),
      api.get<{ code: string; nom: string }[]>('/devises'),
    ]).then(([a, s, d]) => {
      setAgences(a.data)
      setServices(s.data)
      setDevises(d.data)
    })
  }, [])

  useEffect(() => {
    if (id) {
      api.get<TarifData>(`/tarifs/${id}`).then((res) => {
        const t = res.data
        setForm({
          agence_origine_id: t.agence_origine_id ? String(t.agence_origine_id) : '',
          agence_destination_id: t.agence_destination_id ? String(t.agence_destination_id) : '',
          service_id: String(t.service_id),
          devise_code: t.devise_code,
          prix_base: t.prix_base,
          prix_kg: t.prix_kg,
          frais_supplementaires: t.frais_supplementaires,
          date_debut: t.date_debut,
        })
      })
    }
  }, [id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Ajouter cet enregistrement ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    setErrors(undefined)
    const payload = {
      agence_origine_id: form.agence_origine_id ? Number(form.agence_origine_id) : null,
      agence_destination_id: form.agence_destination_id ? Number(form.agence_destination_id) : null,
      service_id: Number(form.service_id),
      devise_code: form.devise_code,
      prix_base: Number(form.prix_base),
      prix_kg: Number(form.prix_kg),
      frais_supplementaires: form.frais_supplementaires ? Number(form.frais_supplementaires) : 0,
      date_debut: form.date_debut,
    }
    try {
      if (isEdit) await api.put(`/tarifs/${id}`, payload)
      else await api.post('/tarifs', payload)
      navigate('/tarifs')
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
      <PageHeader title={isEdit ? 'Modifier le tarif' : 'Nouveau tarif'} actions={<BackButton to="/tarifs" />} />

      <Card>
        <CardHeader><CardTitle>Tarification</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {error && <div className="sm:col-span-2"><Alert variant="error">{error}</Alert></div>}
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2">
              <Label>Agence origine</Label>
              <Select value={form.agence_origine_id} onValueChange={(v) => setForm((f) => ({ ...f, agence_origine_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>{agences.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agence destination</Label>
              <Select value={form.agence_destination_id} onValueChange={(v) => setForm((f) => ({ ...f, agence_destination_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Toutes" /></SelectTrigger>
                <SelectContent>{agences.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label required>Service</Label>
              <Select value={form.service_id} onValueChange={(v) => setForm((f) => ({ ...f, service_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.libelle}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label required>Devise</Label>
              <Select value={form.devise_code} onValueChange={(v) => setForm((f) => ({ ...f, devise_code: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{devises.map((d) => <SelectItem key={d.code} value={d.code}>{d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Prix base</Label><Input required type="number" step="0.01" value={form.prix_base} onChange={(e) => setForm((f) => ({ ...f, prix_base: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Prix / kg</Label><Input required type="number" step="0.01" value={form.prix_kg} onChange={(e) => setForm((f) => ({ ...f, prix_kg: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Frais supplémentaires</Label><Input type="number" step="0.01" value={form.frais_supplementaires} onChange={(e) => setForm((f) => ({ ...f, frais_supplementaires: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Date de début</Label><Input required type="date" value={form.date_debut} onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>{saving && <Spinner />}<Save className="h-4 w-4" /> Enregistrer</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
