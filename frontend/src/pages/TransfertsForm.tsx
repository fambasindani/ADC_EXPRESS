import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { fetchAllPages } from '@/lib/fetchAll'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { Alert, ErrorList } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AgenceOption {
  id: number
  code: string
  nom: string
}

interface ColisDispo {
  id: number
  numero_suivi: string
  nom_destinataire: string
  statut: string
  agence_depot_id: number
  agence_destination_id: number
  agence_depot?: { code: string; nom: string } | null
  agence_destination?: { code: string; nom: string } | null
}

interface TransfertData {
  id: number
  colis_id: number
  agence_depart_id: number
  agence_arrivee_id: number
  statut: string
  colis?: ColisDispo | null
}

const empty = { colis_id: '', agence_depart_id: '', agence_arrivee_id: '' }

export function TransfertsForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { confirm, dialog } = useConfirm()
  const [agences, setAgences] = useState<AgenceOption[]>([])
  const [colisList, setColisList] = useState<ColisDispo[]>([])
  const [colisEdit, setColisEdit] = useState<ColisDispo | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [statut, setStatut] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]> | undefined>()

  useEffect(() => {
    let active = true
    setLoading(true)

    async function load() {
      try {
        const [agencesData, colisData, transfertRes] = await Promise.all([
          fetchAllPages<AgenceOption>('/agences', {}, { maxRows: 2000 }),
          // Les colis disponibles ne servent qu'à la création.
          id
            ? Promise.resolve([] as ColisDispo[])
            : fetchAllPages<ColisDispo>('/transferts/colis-disponibles', {}, { maxRows: 5000 }),
          id ? api.get<TransfertData>(`/transferts/${id}`) : Promise.resolve(null),
        ])
        if (!active) return
        setAgences(agencesData)
        setColisList(colisData)

        if (transfertRes) {
          const t = transfertRes.data
          setStatut(t.statut)
          setForm({
            colis_id: String(t.colis_id),
            agence_depart_id: String(t.agence_depart_id),
            agence_arrivee_id: String(t.agence_arrivee_id),
          })
          if (t.colis) setColisEdit(t.colis)
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Impossible de charger le formulaire.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const selected: ColisDispo | null = useMemo(() => {
    if (isEdit) return colisEdit
    return colisList.find((c) => String(c.id) === form.colis_id) ?? null
  }, [isEdit, colisEdit, colisList, form.colis_id])

  const options: ComboboxOption[] = useMemo(
    () =>
      colisList.map((c) => ({
        value: String(c.id),
        label: c.numero_suivi,
        hint: `${c.nom_destinataire} · ${c.agence_depot?.code ?? '—'} → ${c.agence_destination?.code ?? '—'} · ${c.statut}`,
      })),
    [colisList],
  )

  function choisirColis(value: string) {
    const colis = colisList.find((c) => String(c.id) === value)
    setError(null)
    setForm({
      colis_id: value,
      agence_depart_id: colis ? String(colis.agence_depot_id) : '',
      agence_arrivee_id: colis && String(colis.agence_destination_id) !== String(colis.agence_depot_id)
        ? String(colis.agence_destination_id)
        : '',
    })
  }

  const agenceDepart = agences.find((a) => String(a.id) === form.agence_depart_id)
  const agencesArrivee = agences.filter((a) => String(a.id) !== form.agence_depart_id)
  // Seuls les transferts EN_ATTENTE peuvent être modifiés (règle API).
  const bloque = isEdit && statut !== null && statut !== 'EN_ATTENTE'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bloque) return
    if (!form.colis_id) {
      setError('Sélectionnez un colis.')
      return
    }
    if (!form.agence_arrivee_id) {
      setError("Sélectionnez l'agence d'arrivée.")
      return
    }
    confirm(
      { title: isEdit ? 'Enregistrer les modifications ?' : 'Créer ce transfert ?', description: 'Voulez-vous vraiment poursuivre ?' },
      save,
    )
  }

  async function save() {
    setSaving(true)
    setErrors(undefined)
    setError(null)
    // À la modification, l'API n'accepte que l'agence d'arrivée
    // (le colis et l'agence de départ sont figés).
    const payload = isEdit
      ? { agence_arrivee_id: Number(form.agence_arrivee_id) }
      : {
          colis_id: Number(form.colis_id),
          agence_depart_id: Number(form.agence_depart_id),
          agence_arrivee_id: Number(form.agence_arrivee_id),
        }
    try {
      if (isEdit) await api.put(`/transferts/${id}`, payload)
      else await api.post('/transferts', payload)
      navigate('/transferts')
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in err) {
        setErrors((err as { errors: Record<string, string[]> }).errors)
      }
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={isEdit ? 'Modifier le transfert' : 'Nouveau transfert'}
        description="Transférer un colis vers une autre agence."
        actions={<BackButton to="/transferts" />}
      />

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Informations du transfert</CardTitle>
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
              {bloque && (
                <div className="sm:col-span-2">
                  <Alert variant="info">
                    Ce transfert est en statut <strong>{statut}</strong> : il ne peut plus être modifié.
                  </Alert>
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label required>Colis</Label>
                {isEdit ? (
                  <p className="font-mono text-sm font-semibold text-brand-dark">
                    {selected?.numero_suivi ?? `#${form.colis_id}`}
                  </p>
                ) : (
                  <Combobox
                    options={options}
                    value={form.colis_id}
                    onChange={choisirColis}
                    placeholder="Rechercher par n° de suivi ou destinataire…"
                    searchPlaceholder="N° suivi, nom ou téléphone…"
                    emptyText="Aucun colis transférable"
                  />
                )}
              </div>

              {selected && (
                <div className="rounded-lg border border-brand-border bg-brand-grayLight/60 p-4 text-sm sm:col-span-2">
                  <p className="text-slate-500">
                    Destinataire : <span className="font-medium text-brand-dark">{selected.nom_destinataire}</span>
                  </p>
                  <p className="mt-1 text-slate-500">
                    Trajet :{' '}
                    <span className="font-medium text-brand-dark">
                      {selected.agence_depot?.code ?? '—'} → {selected.agence_destination?.code ?? '—'}
                    </span>{' '}
                    · Statut : <span className="font-mono text-xs font-semibold">{selected.statut}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    ID colis : <span className="font-mono">{selected.id}</span>
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Agence de départ</Label>
                <Select value={form.agence_depart_id || undefined} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Définie par le colis" />
                  </SelectTrigger>
                  <SelectContent>
                    {agenceDepart && (
                      <SelectItem value={String(agenceDepart.id)}>
                        {agenceDepart.code} — {agenceDepart.nom}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Déterminée automatiquement par l'agence du colis.</p>
              </div>

              <div className="space-y-2">
                <Label required>Agence d'arrivée</Label>
                <Select
                  value={form.agence_arrivee_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, agence_arrivee_id: v }))}
                  disabled={bloque}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une agence" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencesArrivee.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving || bloque || !form.colis_id}>
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
