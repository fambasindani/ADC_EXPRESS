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

interface CaisseData {
  id: number
  agence_id: number
  code: string
  libelle: string
  devise_code: string
  solde_initial: string
}

const empty = { agence_id: '', code: '', libelle: '', devise_code: 'CDF', solde_initial: '' }

export function CaissesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [agences, setAgences] = useState<{ id: number; nom: string }[]>([])
  const [devises, setDevises] = useState<{ code: string; nom: string }[]>([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    Promise.all([api.get<{ id: number; nom: string }[]>('/agences'), api.get<{ code: string; nom: string }[]>('/devises')]).then(
      ([a, d]) => {
        setAgences(a.data)
        setDevises(d.data)
      },
    )
  }, [])

  useEffect(() => {
    if (id) {
      api.get<CaisseData>(`/caisses/${id}`).then((res) => {
        const c = res.data
        setForm({
          agence_id: String(c.agence_id),
          code: c.code,
          libelle: c.libelle,
          devise_code: c.devise_code,
          solde_initial: c.solde_initial,
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
    setErrors(undefined)
    const payload = {
      agence_id: Number(form.agence_id),
      code: form.code,
      libelle: form.libelle,
      devise_code: form.devise_code,
      solde_initial: form.solde_initial ? Number(form.solde_initial) : 0,
    }
    try {
      if (isEdit) await api.put(`/caisses/${id}`, payload)
      else await api.post('/caisses', payload)
      navigate('/caisses')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader title={isEdit ? 'Modifier la caisse' : 'Nouvelle caisse'} actions={<BackButton to="/caisses" />} />

      <Card>
        <CardHeader><CardTitle>Informations de la caisse</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2">
              <Label>Agence</Label>
              <Select value={form.agence_id} onValueChange={(v) => setForm((f) => ({ ...f, agence_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agences.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Code</Label><Input required value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Libellé</Label><Input required value={form.libelle} onChange={(e) => setForm((f) => ({ ...f, libelle: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={form.devise_code} onValueChange={(v) => setForm((f) => ({ ...f, devise_code: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{devises.map((d) => <SelectItem key={d.code} value={d.code}>{d.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Solde initial</Label><Input type="number" step="0.01" value={form.solde_initial} onChange={(e) => setForm((f) => ({ ...f, solde_initial: e.target.value }))} /></div>
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
