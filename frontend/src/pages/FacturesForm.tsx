import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { ErrorList } from '@/components/Alert'
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

interface FactureData {
  id: number
  colis_id: number
  montant_total: string
  devise_code: string
}

const empty = { colis_id: '', montant_total: '', devise_code: 'CDF' }

export function FacturesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [devises, setDevises] = useState<{ code: string; nom: string }[]>([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    api.get<{ code: string; nom: string }[]>('/devises').then((r) => setDevises(r.data))
  }, [])

  useEffect(() => {
    if (id) {
      api.get<FactureData>(`/factures/${id}`).then((res) => {
        const f = res.data
        setForm({ colis_id: String(f.colis_id), montant_total: f.montant_total, devise_code: f.devise_code })
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
    setErrors(undefined)
    const payload = { colis_id: Number(form.colis_id), montant_total: Number(form.montant_total), devise_code: form.devise_code }
    try {
      if (isEdit) await api.put(`/factures/${id}`, payload)
      else await api.post('/factures', payload)
      navigate('/factures')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
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
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            {errors && <div className="sm:col-span-3"><ErrorList errors={errors} /></div>}
            <div className="space-y-2"><Label>ID du colis</Label><Input required type="number" value={form.colis_id} onChange={(e) => setForm((f) => ({ ...f, colis_id: e.target.value }))} /></div>
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
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
