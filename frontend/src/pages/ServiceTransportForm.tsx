import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import type { ServiceTransport } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { Alert, ErrorList } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const empty = { code: '', libelle: '', delai_indicatif_jours: '', description: '' }

export function ServiceTransportForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      api.get<ServiceTransport>(`/services-transport/${id}`).then((res) => {
        const s = res.data
        setForm({ code: s.code, libelle: s.libelle, delai_indicatif_jours: s.delai_indicatif_jours != null ? String(s.delai_indicatif_jours) : '', description: s.description ?? '' })
      })
    }
  }, [id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Ajouter ce service ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    setErrors(undefined)
    const payload = {
      code: form.code,
      libelle: form.libelle,
      delai_indicatif_jours: form.delai_indicatif_jours ? Number(form.delai_indicatif_jours) : null,
      description: form.description || null,
    }
    try {
      if (isEdit) await api.put(`/services-transport/${id}`, payload)
      else await api.post('/services-transport', payload)
      navigate('/references')
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
      <PageHeader title={isEdit ? 'Modifier le service' : 'Nouveau service de transport'} actions={<BackButton to="/references" />} />

      <Card>
        <CardHeader><CardTitle>Informations du service</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {error && <div className="sm:col-span-2"><Alert variant="error">{error}</Alert></div>}
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2"><Label>Code</Label><Input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Libellé</Label><Input required value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Délai indicatif (jours)</Label><Input type="number" value={form.delai_indicatif_jours} onChange={(e) => setForm((f) => ({ ...f, delai_indicatif_jours: e.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
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
