import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetchAll'
import type { Ville } from '@/types'
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

const empty = { province_id: '', nom: '' }

export function VilleForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [provinces, setProvinces] = useState<{ id: number; nom: string }[]>([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    fetchAllPages<{ id: number; nom: string }>('/provinces', {}, { maxRows: 500 }).then(setProvinces)
  }, [])

  useEffect(() => {
    if (id) {
      api.get<Ville>(`/villes/${id}`).then((res) => {
        setForm({ province_id: String(res.data.province_id), nom: res.data.nom })
      })
    }
  }, [id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Ajouter cette ville ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    const payload = { province_id: Number(form.province_id), nom: form.nom }
    try {
      if (isEdit) await api.put(`/villes/${id}`, payload)
      else await api.post('/villes', payload)
      navigate('/localisation')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader title={isEdit ? 'Modifier la ville' : 'Nouvelle ville'} actions={<BackButton to="/localisation" />} />

      <Card>
        <CardHeader><CardTitle>Informations de la ville</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2">
              <Label>Province</Label>
              <Select value={form.province_id} onValueChange={(v) => setForm((f) => ({ ...f, province_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{provinces.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nom</Label><Input required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></div>
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
