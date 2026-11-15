import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { MODES_TRANSPORT } from '@/lib/constants'
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

interface ExpeditionData {
  id: number
  agence_depart_id: number
  agence_arrivee_id: number
  mode_transport: string
  transporteur: string | null
  statut: string
}

const empty = { agence_depart_id: '', agence_arrivee_id: '', mode_transport: 'ROUTE', transporteur: '' }

export function ExpeditionsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [agences, setAgences] = useState<{ id: number; nom: string }[]>([])
  const [form, setForm] = useState(empty)
  const [statut, setStatut] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      api.get<{ id: number; nom: string }[]>('/agences'),
      id ? api.get<ExpeditionData>(`/expeditions/${id}`) : Promise.resolve(null),
    ])
      .then(([agencesRes, expeditionRes]) => {
        if (!active) return
        setAgences(agencesRes.data)
        if (expeditionRes) {
          const e = expeditionRes.data
          setStatut(e.statut)
          setForm({
            agence_depart_id: String(e.agence_depart_id),
            agence_arrivee_id: String(e.agence_arrivee_id),
            mode_transport: e.mode_transport,
            transporteur: e.transporteur ?? '',
          })
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger l'expédition.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  // Une expédition ARRIVEE ou ANNULEE est clôturée et non modifiable (règle API).
  const bloque = isEdit && (statut === 'ARRIVEE' || statut === 'ANNULEE')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bloque) return
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
      agence_depart_id: Number(form.agence_depart_id),
      agence_arrivee_id: Number(form.agence_arrivee_id),
      mode_transport: form.mode_transport,
      transporteur: form.transporteur || null,
    }
    try {
      if (isEdit) await api.put(`/expeditions/${id}`, payload)
      else await api.post('/expeditions', payload)
      navigate('/expeditions')
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
      <PageHeader title={isEdit ? "Modifier l'expédition" : 'Nouvelle expédition'} actions={<BackButton to="/expeditions" />} />

      <Card>
        <CardHeader><CardTitle>Informations de l'expédition</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Spinner /> Chargement…
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {error && <div className="sm:col-span-2"><Alert variant="error">{error}</Alert></div>}
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            {bloque && (
              <div className="sm:col-span-2">
                <Alert variant="info">
                  Cette expédition est en statut <strong>{statut}</strong> : elle est clôturée et ne peut plus être modifiée.
                </Alert>
              </div>
            )}
            <div className="space-y-2">
              <Label>Agence départ</Label>
              <Select value={form.agence_depart_id} onValueChange={(v) => setForm((f) => ({ ...f, agence_depart_id: v }))} disabled={bloque}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agences.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agence arrivée</Label>
              <Select value={form.agence_arrivee_id} onValueChange={(v) => setForm((f) => ({ ...f, agence_arrivee_id: v }))} disabled={bloque}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agences.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode de transport</Label>
              <Select value={form.mode_transport} onValueChange={(v) => setForm((f) => ({ ...f, mode_transport: v }))} disabled={bloque}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODES_TRANSPORT.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Transporteur</Label><Input value={form.transporteur} onChange={(e) => setForm((f) => ({ ...f, transporteur: e.target.value }))} disabled={bloque} /></div>
            <div className="flex justify-end gap-2 sm:col-span-2">
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
