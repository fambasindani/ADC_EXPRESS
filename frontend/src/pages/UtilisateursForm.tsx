import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import type { User } from '@/types'
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

const empty = { nom: '', postnom: '', prenom: '', email: '', telephone: '', password: '', agence_id: '' }

export function UtilisateursForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [agences, setAgences] = useState<{ id: number; nom: string }[]>([])
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    api.get<{ id: number; nom: string }[]>('/agences').then((r) => setAgences(r.data))
  }, [])

  useEffect(() => {
    if (id) {
      api.get<User>(`/users/${id}`).then((res) => {
        const u = res.data
        setForm({
          nom: u.nom,
          postnom: u.postnom ?? '',
          prenom: u.prenom ?? '',
          email: u.email,
          telephone: u.telephone ?? '',
          password: '',
          agence_id: u.agence_id ? String(u.agence_id) : '',
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
    const payload: Record<string, unknown> = {
      nom: form.nom,
      postnom: form.postnom || null,
      prenom: form.prenom || null,
      email: form.email,
      telephone: form.telephone || null,
      agence_id: form.agence_id ? Number(form.agence_id) : null,
    }
    if (form.password) payload.password = form.password
    try {
      if (isEdit) await api.put(`/users/${id}`, payload)
      else await api.post('/users', payload)
      navigate('/utilisateurs')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader title={isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'} actions={<BackButton to="/utilisateurs" />} />

      <Card>
        <CardHeader><CardTitle>Informations de l'utilisateur</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2"><Label>Nom</Label><Input required value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Post-nom</Label><Input value={form.postnom} onChange={(e) => setForm((f) => ({ ...f, postnom: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Prénom</Label><Input value={form.prenom} onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Mot de passe {isEdit && '(laisser vide pour conserver)'}</Label><Input type="password" required={!isEdit} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Agence</Label>
              <Select value={form.agence_id} onValueChange={(v) => setForm((f) => ({ ...f, agence_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{agences.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
