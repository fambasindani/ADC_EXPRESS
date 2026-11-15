import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import type { ModePaiement } from '@/types'
import { CATEGORIES_MODE_PAIEMENT } from '@/lib/constants'
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

const empty = { code: '', libelle: '', categorie: 'ESPECES', operateur: '' }

export function ModePaiementForm() {
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
      api.get<ModePaiement>(`/modes-paiement/${id}`).then((res) => {
        const m = res.data
        setForm({ code: m.code, libelle: m.libelle, categorie: m.categorie, operateur: m.operateur ?? '' })
      })
    }
  }, [id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Ajouter ce mode de paiement ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    setErrors(undefined)
    const payload = { code: form.code, libelle: form.libelle, categorie: form.categorie, operateur: form.operateur || null }
    try {
      if (isEdit) await api.put(`/modes-paiement/${id}`, payload)
      else await api.post('/modes-paiement', payload)
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
      <PageHeader title={isEdit ? 'Modifier le mode de paiement' : 'Nouveau mode de paiement'} actions={<BackButton to="/references" />} />

      <Card>
        <CardHeader><CardTitle>Informations du mode de paiement</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {error && <div className="sm:col-span-2"><Alert variant="error">{error}</Alert></div>}
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2"><Label>Code</Label><Input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Libellé</Label><Input required value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label required>Catégorie</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm((f) => ({ ...f, categorie: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES_MODE_PAIEMENT.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Opérateur</Label><Input value={form.operateur} onChange={(e) => setForm((f) => ({ ...f, operateur: e.target.value }))} /></div>
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
