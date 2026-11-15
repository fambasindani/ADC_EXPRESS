import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import type { Devise } from '@/types'
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

const empty = { code: '', nom: '', symbole: '', decimales: '2' }

export function DeviseForm() {
  const navigate = useNavigate()
  const { code: deviseCode } = useParams()
  const isEdit = Boolean(deviseCode)
  const { confirm, dialog } = useConfirm()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    if (deviseCode) {
      api.get<Devise>(`/devises/${deviseCode}`).then((res) => {
        const d = res.data
        setForm({ code: d.code, nom: d.nom, symbole: d.symbole, decimales: String(d.decimales ?? 2) })
      })
    }
  }, [deviseCode])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Ajouter cette devise ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    const payload = { nom: form.nom, symbole: form.symbole, decimales: Number(form.decimales) }
    try {
      if (isEdit) await api.put(`/devises/${deviseCode}`, payload)
      else await api.post('/devises', { ...payload, code: form.code })
      navigate('/references')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader title={isEdit ? 'Modifier la devise' : 'Nouvelle devise'} actions={<BackButton to="/references" />} />

      <Card>
        <CardHeader><CardTitle>Informations de la devise</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2">
              <Label>Code</Label>
              <Input required disabled={isEdit} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="space-y-2"><Label>Nom</Label><Input required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Symbole</Label><Input required value={form.symbole} onChange={(e) => setForm((f) => ({ ...f, symbole: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Décimales</Label><Input required type="number" min="0" value={form.decimales} onChange={(e) => setForm((f) => ({ ...f, decimales: e.target.value }))} /></div>
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
