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

interface RemboursementData {
  id: number
  paiement_id: number
  montant: string
  motif: string
}

const empty = { paiement_id: '', montant: '', motif: '' }

export function RemboursementsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    if (id) {
      api.get<RemboursementData>(`/remboursements/${id}`).then((res) => {
        const r = res.data
        setForm({ paiement_id: String(r.paiement_id), montant: r.montant, motif: r.motif })
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
    const payload = { paiement_id: Number(form.paiement_id), montant: Number(form.montant), motif: form.motif }
    try {
      if (isEdit) await api.put(`/remboursements/${id}`, payload)
      else await api.post('/remboursements', payload)
      navigate('/remboursements')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
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
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            {errors && <div className="sm:col-span-3"><ErrorList errors={errors} /></div>}
            <div className="space-y-2"><Label>ID du paiement</Label><Input required type="number" value={form.paiement_id} onChange={(e) => setForm((f) => ({ ...f, paiement_id: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Montant</Label><Input required type="number" step="0.01" value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Motif</Label><Input required value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} /></div>
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
