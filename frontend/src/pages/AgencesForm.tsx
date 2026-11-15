import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { TYPES_AGENCE } from '@/lib/constants'
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
import type { Agence } from '@/types'

interface AgenceOptions {
  provinces: { id: number; code: string; nom: string }[]
  villes: { id: number; nom: string; province_id: number }[]
  communes: { id: number; nom: string; ville_id: number }[]
  agences_parentes: { id: number; code: string; nom: string; type_agence: string }[]
}

interface AgenceDetail {
  agence: Agence
}

const empty = {
  code: '',
  nom: '',
  province_id: '',
  ville_id: '',
  commune_id: '',
  type_agence: 'SECONDAIRE',
  adresse: '',
  telephone: '',
  email: '',
  agence_parent_id: '',
  actif: true,
}

export function AgencesForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [options, setOptions] = useState<AgenceOptions | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      try {
        const [optionsRes, agenceRes] = await Promise.all([
          api.get<AgenceOptions>('/agences/form-data'),
          id ? api.get<AgenceDetail>(`/agences/${id}`) : Promise.resolve(null),
        ])
        if (!active) return
        setOptions(optionsRes.data)

        if (agenceRes) {
          // GET /agences/{id} renvoie { data: { agence, stats } }
          const a = agenceRes.data.agence
          setForm({
            code: a.code ?? '',
            nom: a.nom ?? '',
            province_id: a.province_id ? String(a.province_id) : '',
            ville_id: a.ville_id ? String(a.ville_id) : '',
            commune_id: a.commune_id ? String(a.commune_id) : '',
            type_agence: a.type_agence ?? 'SECONDAIRE',
            adresse: a.adresse ?? '',
            telephone: a.telephone ?? '',
            email: a.email ?? '',
            agence_parent_id: a.agence_parent_id ? String(a.agence_parent_id) : '',
            actif: a.actif ?? true,
          })
        }
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Impossible de charger le formulaire.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const villes = useMemo(() => {
    if (!options) return []
    if (!form.province_id) return options.villes
    return options.villes.filter((v) => String(v.province_id) === form.province_id)
  }, [options, form.province_id])

  const communes = useMemo(() => {
    if (!options || !form.ville_id) return []
    return options.communes.filter((c) => String(c.ville_id) === form.ville_id)
  }, [options, form.ville_id])

  const parents = useMemo(() => {
    if (!options) return []
    return options.agences_parentes.filter((a) => String(a.id) !== id)
  }, [options, id])

  function changeProvince(value: string) {
    setForm((f) => ({ ...f, province_id: value, ville_id: '', commune_id: '' }))
  }

  function changeVille(value: string) {
    setForm((f) => ({ ...f, ville_id: value, commune_id: '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.province_id || !form.ville_id) {
      window.alert('Sélectionnez une province et une ville.')
      return
    }
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : "Ajouter cette agence ?", description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    const payload = {
      code: form.code,
      nom: form.nom,
      province_id: Number(form.province_id),
      ville_id: Number(form.ville_id),
      commune_id: form.commune_id ? Number(form.commune_id) : null,
      agence_parent_id: form.agence_parent_id ? Number(form.agence_parent_id) : null,
      type_agence: form.type_agence,
      adresse: form.adresse,
      telephone: form.telephone || null,
      email: form.email || null,
      actif: form.actif,
    }
    try {
      if (isEdit) await api.put(`/agences/${id}`, payload)
      else await api.post('/agences', payload)
      navigate('/agences')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) setErrors((err as { errors: Record<string, string[]> }).errors)
      else window.alert(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title={isEdit ? "Modifier l'agence" : 'Nouvelle agence'}
        description="Coordonnées et rattachement géographique de l'agence."
        actions={<BackButton to="/agences" />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations de l'agence</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <Spinner /> Chargement…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              {errors && (
                <div className="sm:col-span-2">
                  <ErrorList errors={errors} />
                </div>
              )}

              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  required
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label required>Province</Label>
                <Select value={form.province_id || undefined} onValueChange={changeProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une province" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.provinces ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label required>Ville</Label>
                <Select value={form.ville_id || undefined} onValueChange={changeVille}>
                  <SelectTrigger>
                    <SelectValue placeholder={form.province_id ? 'Sélectionner une ville' : 'Choisir d’abord une province'} />
                  </SelectTrigger>
                  <SelectContent>
                    {villes.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Commune</Label>
                <Select
                  value={form.commune_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, commune_id: v }))}
                  disabled={!form.ville_id || communes.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.ville_id ? 'Optionnel' : 'Choisir d’abord une ville'} />
                  </SelectTrigger>
                  <SelectContent>
                    {communes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type_agence}
                  onValueChange={(v) => setForm((f) => ({ ...f, type_agence: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_AGENCE.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agence parente</Label>
                <Select
                  value={form.agence_parent_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, agence_parent_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.telephone}
                  onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Adresse</Label>
                <Input
                  required
                  value={form.adresse}
                  onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="agence-actif"
                  type="checkbox"
                  className="h-4 w-4 rounded border-brand-border text-brand-red focus:ring-brand-red/40"
                  checked={form.actif}
                  onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
                />
                <Label htmlFor="agence-actif">Agence active</Label>
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Spinner />}
                  <Save className="h-4 w-4" /> Enregistrer
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
