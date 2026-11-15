import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { TYPES_CLIENT, TYPE_CLIENT_LABEL } from '@/lib/constants'
import type { Client } from '@/types'
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

const empty = {
  type_client: 'PERSONNE_PHYSIQUE',
  nom_ou_raison_sociale: '',
  telephone: '',
  telephone_secondaire: '',
  email: '',
  adresse: '',
}

export function ClientsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    if (id) {
      api.get<Client>(`/clients/${id}`).then((res) => {
        const c = res.data
        setForm({
          type_client: c.type_client,
          nom_ou_raison_sociale: c.nom_ou_raison_sociale,
          telephone: c.telephone,
          telephone_secondaire: c.telephone_secondaire ?? '',
          email: c.email ?? '',
          adresse: c.adresse ?? '',
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
    try {
      if (isEdit) await api.put(`/clients/${id}`, form)
      else await api.post('/clients', form)
      navigate('/clients')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title={isEdit ? 'Modifier le client' : 'Nouveau client'}
        description={isEdit ? 'Mettre à jour le client.' : 'Créer un client ou expéditeur.'}
        actions={<BackButton to="/clients" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {errors && <div className="sm:col-span-2"><ErrorList errors={errors} /></div>}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type_client} onValueChange={(v) => setForm((f) => ({ ...f, type_client: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES_CLIENT.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_CLIENT_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nom / Raison sociale</Label>
              <Input required value={form.nom_ou_raison_sociale} onChange={(e) => setForm((f) => ({ ...f, nom_ou_raison_sociale: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input required value={form.telephone} onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone secondaire</Label>
              <Input value={form.telephone_secondaire} onChange={(e) => setForm((f) => ({ ...f, telephone_secondaire: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input value={form.adresse} onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving && <Spinner />}
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
