import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '@/lib/api'
import { MODES_FACTURATION, MODE_FACTURATION_LABEL, STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { Alert, ErrorList } from '@/components/Alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Agence, Colis, Devise, ServiceTransport, TypeColis, Ville } from '@/types'

interface ColisOptions {
  agences: Agence[]
  villes: Ville[]
  types_colis: TypeColis[]
  services_transport: ServiceTransport[]
  devises: Devise[]
}

const emptyForm = {
  nom_expediteur: '',
  telephone_expediteur: '',
  adresse_expediteur: '',
  nom_destinataire: '',
  telephone_destinataire: '',
  email_destinataire: '',
  adresse_destinataire: '',
  ville_destination_id: '',
  agence_depot_id: '',
  agence_destination_id: '',
  type_colis_id: '',
  service_id: '',
  description_contenu: '',
  poids_kg: '',
  longueur_cm: '',
  largeur_cm: '',
  hauteur_cm: '',
  valeur_declaree: '',
  devise_valeur: '',
  montant_transport: '',
  devise_paiement: 'CDF',
  mode_facturation: 'PAYE_AU_DEPOT',
  date_estimee_arrivee: '',
  observations: '',
}

function fromColis(c: Colis) {
  return {
    nom_expediteur: c.nom_expediteur ?? '',
    telephone_expediteur: c.telephone_expediteur ?? '',
    adresse_expediteur: c.adresse_expediteur ?? '',
    nom_destinataire: c.nom_destinataire ?? '',
    telephone_destinataire: c.telephone_destinataire ?? '',
    email_destinataire: c.email_destinataire ?? '',
    adresse_destinataire: c.adresse_destinataire ?? '',
    ville_destination_id: c.ville_destination_id ? String(c.ville_destination_id) : '',
    agence_depot_id: c.agence_depot_id ? String(c.agence_depot_id) : '',
    agence_destination_id: c.agence_destination_id ? String(c.agence_destination_id) : '',
    type_colis_id: c.type_colis_id ? String(c.type_colis_id) : '',
    service_id: c.service_id ? String(c.service_id) : '',
    description_contenu: c.description_contenu ?? '',
    poids_kg: c.poids_kg != null ? String(c.poids_kg) : '',
    longueur_cm: c.longueur_cm != null ? String(c.longueur_cm) : '',
    largeur_cm: c.largeur_cm != null ? String(c.largeur_cm) : '',
    hauteur_cm: c.hauteur_cm != null ? String(c.hauteur_cm) : '',
    valeur_declaree: c.valeur_declaree != null ? String(c.valeur_declaree) : '',
    devise_valeur: c.devise_valeur ?? '',
    montant_transport: c.montant_transport != null ? String(c.montant_transport) : '',
    devise_paiement: c.devise_paiement ?? 'CDF',
    mode_facturation: c.mode_facturation ?? 'PAYE_AU_DEPOT',
    date_estimee_arrivee: c.date_estimee_arrivee ? String(c.date_estimee_arrivee).slice(0, 10) : '',
    observations: c.observations ?? '',
  }
}

export function ColisForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [formData, setFormData] = useState<ColisOptions | null>(null)
  const [colisInfo, setColisInfo] = useState<Colis | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api
      .get<ColisOptions>('/colis/form-data')
      .then(async (res) => {
        if (!active) return
        setFormData(res.data)
        if (id) {
          const colisRes = await api.get<Colis>(`/colis/${id}`)
          if (!active) return
          setColisInfo(colisRes.data)
          setForm(fromColis(colisRes.data))
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Impossible de charger le colis.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setErrors(undefined)
    try {
      const payload = {
        ...form,
        poids_kg: Number(form.poids_kg),
        montant_transport: Number(form.montant_transport),
        longueur_cm: form.longueur_cm ? Number(form.longueur_cm) : null,
        largeur_cm: form.largeur_cm ? Number(form.largeur_cm) : null,
        hauteur_cm: form.hauteur_cm ? Number(form.hauteur_cm) : null,
        valeur_declaree: form.valeur_declaree ? Number(form.valeur_declaree) : null,
        ville_destination_id: form.ville_destination_id ? Number(form.ville_destination_id) : null,
        devise_valeur: form.devise_valeur || null,
        date_estimee_arrivee: form.date_estimee_arrivee || null,
        agence_depot_id: Number(form.agence_depot_id),
        agence_destination_id: Number(form.agence_destination_id),
        type_colis_id: Number(form.type_colis_id),
        service_id: Number(form.service_id),
      }

      if (isEdit) {
        await api.put(`/colis/${id}`, payload)
        navigate(`/colis/${id}`)
      } else {
        const res = await api.post<{ colis: { id: number } }>('/colis', payload)
        navigate(`/colis/${res.data.colis.id}`)
      }
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      if (err && typeof err === 'object' && 'errors' in err) {
        setErrors((err as { errors: Record<string, string[]> }).errors)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="h-40 animate-pulse rounded-lg bg-brand-border" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <PageHeader
        title={isEdit ? 'Modifier le colis' : 'Nouveau colis'}
        description={
          isEdit
            ? 'Mettre à jour les informations du colis, de l’expéditeur et du destinataire.'
            : 'Enregistrer un colis, sa facture et son historique initial.'
        }
        actions={
          <Button variant="outline" onClick={() => navigate(isEdit ? `/colis/${id}` : '/colis')}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        }
      />

      {isEdit && colisInfo && (
        <Alert variant="info" className="mb-4">
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Colis <strong className="font-mono">{colisInfo.numero_suivi}</strong> — le statut se modifie depuis la
              fiche du colis.
            </span>
            <Badge className={STATUT_COLIS_STYLE[colisInfo.statut as StatutColis] ?? ''}>{colisInfo.statut}</Badge>
          </span>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        {errors && <ErrorList errors={errors} />}

        <Card>
          <CardHeader>
            <CardTitle>Expéditeur</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom de l'expéditeur</Label>
              <Input required value={form.nom_expediteur} onChange={(e) => update('nom_expediteur', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input required value={form.telephone_expediteur} onChange={(e) => update('telephone_expediteur', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Adresse</Label>
              <Input value={form.adresse_expediteur} onChange={(e) => update('adresse_expediteur', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Destinataire</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom du destinataire</Label>
              <Input required value={form.nom_destinataire} onChange={(e) => update('nom_destinataire', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input required value={form.telephone_destinataire} onChange={(e) => update('telephone_destinataire', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email_destinataire} onChange={(e) => update('email_destinataire', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ville de destination</Label>
              <Select value={form.ville_destination_id} onValueChange={(v) => update('ville_destination_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.villes ?? []).map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Adresse de livraison</Label>
              <Input value={form.adresse_destinataire} onChange={(e) => update('adresse_destinataire', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acheminement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label required>Agence de dépôt</Label>
              <Select value={form.agence_depot_id} onValueChange={(v) => update('agence_depot_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.agences ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label required>Agence de destination</Label>
              <Select value={form.agence_destination_id} onValueChange={(v) => update('agence_destination_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.agences ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label required>Type de colis</Label>
              <Select value={form.type_colis_id} onValueChange={(v) => update('type_colis_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.types_colis ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label required>Service de transport</Label>
              <Select value={form.service_id} onValueChange={(v) => update('service_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.services_transport ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date estimée d'arrivée</Label>
              <Input
                type="date"
                value={form.date_estimee_arrivee}
                onChange={(e) => update('date_estimee_arrivee', e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description du contenu</Label>
              <Textarea value={form.description_contenu} onChange={(e) => update('description_contenu', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tarification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Poids (kg)</Label>
              <Input required type="number" step="0.001" min="0.01" value={form.poids_kg} onChange={(e) => update('poids_kg', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Longueur (cm)</Label>
              <Input type="number" step="0.01" min="0" value={form.longueur_cm} onChange={(e) => update('longueur_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Largeur (cm)</Label>
              <Input type="number" step="0.01" min="0" value={form.largeur_cm} onChange={(e) => update('largeur_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hauteur (cm)</Label>
              <Input type="number" step="0.01" min="0" value={form.hauteur_cm} onChange={(e) => update('hauteur_cm', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label required>Mode de facturation</Label>
              <Select value={form.mode_facturation} onValueChange={(v) => update('mode_facturation', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES_FACTURATION.map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_FACTURATION_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant transport</Label>
              <Input required type="number" step="0.01" min="0" value={form.montant_transport} onChange={(e) => update('montant_transport', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label required>Devise de paiement</Label>
              <Select value={form.devise_paiement} onValueChange={(v) => update('devise_paiement', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.devises ?? []).map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valeur déclarée</Label>
              <Input type="number" step="0.01" min="0" value={form.valeur_declaree} onChange={(e) => update('valeur_declaree', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Devise de la valeur</Label>
              <Select value={form.devise_valeur} onValueChange={(v) => update('devise_valeur', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(formData?.devises ?? []).map((d) => (
                    <SelectItem key={d.code} value={d.code}>
                      {d.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Observations</Label>
              <Textarea value={form.observations} onChange={(e) => update('observations', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/colis/${id}` : '/colis')}>
            Annuler
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            <Save className="h-4 w-4" /> {isEdit ? 'Enregistrer les modifications' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
}
