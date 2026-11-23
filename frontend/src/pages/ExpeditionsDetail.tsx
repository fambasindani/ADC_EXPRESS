import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Play,
  Flag,
  Ban,
  PackagePlus,
  PackageMinus,
  Truck,
  User,
  CalendarDays,
  Search,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime, formatKg } from '@/lib/format'
import { STATUT_EXPEDITION_STYLE, STATUT_COLIS_STYLE, type StatutColis } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ColisExp {
  id: number
  numero_suivi: string
  nom_destinataire: string
  statut: string
  poids_kg: number
  agence_depot?: { code: string; nom: string } | null
  agence_destination?: { code: string; nom: string } | null
  pivot?: { date_chargement: string | null; date_dechargement: string | null }
}

interface ExpeditionData {
  id: number
  reference: string
  mode_transport: string
  transporteur: string | null
  numero_moyen_transport: string | null
  chauffeur_nom: string | null
  chauffeur_telephone: string | null
  date_depart: string | null
  date_arrivee_prevue: string | null
  date_arrivee_reelle: string | null
  statut: string
  created_at: string | null
  colis_count?: number
  colis?: ColisExp[]
  agence_depart?: { id: number; code: string; nom: string } | null
  agence_arrivee?: { id: number; code: string; nom: string } | null
  createur?: { id: number; nom: string; prenom: string } | null
}

function toggleId(ensemble: Set<number>, id: number, setter: (s: Set<number>) => void) {
  const suivant = new Set(ensemble)
  if (suivant.has(id)) suivant.delete(id)
  else suivant.add(id)
  setter(suivant)
}

export function ExpeditionsDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { confirm, dialog } = useConfirm()

  const [data, setData] = useState<ExpeditionData | null>(null)
  const [disponibles, setDisponibles] = useState<ColisExp[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [aCharger, setACharger] = useState<Set<number>>(new Set())
  const [aDecharger, setADecharger] = useState<Set<number>>(new Set())
  const [recherche, setRecherche] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [exp, dispo] = await Promise.all([
        api.get<ExpeditionData>(`/expeditions/${id}`),
        api.get<ColisExp[]>(`/expeditions/${id}/colis-disponibles`),
      ])
      setData(exp.data)
      setDisponibles(dispo.data ?? [])
      setACharger(new Set())
      setADecharger(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger l'expédition.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const colisCharges = data?.colis ?? []
  const cloturee = data?.statut === 'ARRIVEE' || data?.statut === 'ANNULEE'

  const dispoFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return disponibles
    return disponibles.filter(
      (c) =>
        c.numero_suivi.toLowerCase().includes(q) ||
        c.nom_destinataire.toLowerCase().includes(q) ||
        (c.agence_depot?.code ?? '').toLowerCase().includes(q) ||
        (c.agence_destination?.code ?? '').toLowerCase().includes(q),
    )
  }, [disponibles, recherche])

  async function actionPost(path: string, onConfirm: string) {
    setActionLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await api.post<{ message?: string }>(path)
      setMessage(res.message ?? onConfirm)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "L'opération a échoué.")
    } finally {
      setActionLoading(false)
    }
  }

  function demarrer() {
    confirm(
      { title: 'Démarrer cette expédition ?', description: "Le convoi passera en EN_COURS et la date de départ réelle sera enregistrée.", variant: 'default', confirmLabel: 'Démarrer' },
      () => actionPost(`/expeditions/${id}/demarrer`, 'Expédition démarrée.'),
    )
  }

  function arriver() {
    confirm(
      { title: "Marquer l'expédition comme arrivée ?", description: "Le convoi passera en ARRIVEE. Vous pourrez ensuite décharger les colis.", variant: 'default', confirmLabel: 'Arrivée' },
      () => actionPost(`/expeditions/${id}/arriver`, 'Expédition arrivée à destination.'),
    )
  }

  function annuler() {
    confirm(
      { title: 'Annuler cette expédition ?', description: 'Cette action est irréversible.', variant: 'danger', confirmLabel: 'Annuler' },
      () => actionPost(`/expeditions/${id}/annuler`, 'Expédition annulée.'),
    )
  }

  async function charger() {
    if (aCharger.size === 0) return
    setActionLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await api.post<{ message?: string }>(`/expeditions/${id}/charger-colis`, { colis_ids: [...aCharger] })
      setMessage(res.message ?? 'Colis chargés.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le chargement a échoué.')
    } finally {
      setActionLoading(false)
    }
  }

  async function decharger() {
    if (aDecharger.size === 0) return
    setActionLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await api.post<{ message?: string }>(`/expeditions/${id}/decharger-colis`, { colis_ids: [...aDecharger] })
      setMessage(res.message ?? 'Colis déchargés.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le déchargement a échoué.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="page-container">
        <Alert variant="error">Expédition introuvable.</Alert>
      </div>
    )
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={data.reference}
        description="Convoi inter-agences : chargement des colis et suivi de l'acheminement."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={`/expeditions/${data.id}/modifier`}>
                <Pencil className="h-4 w-4" /> Modifier
              </Link>
            </Button>
            <Button variant="outline" onClick={() => navigate('/expeditions')}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Informations du convoi
              <Badge className={STATUT_EXPEDITION_STYLE[data.statut] ?? ''}>{data.statut}</Badge>
            </CardTitle>
            <CardDescription>
              Créée le {formatDateTime(data.created_at)} · {data.colis_count ?? 0} colis chargé(s)
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.statut === 'PLANIFIEE' && (
              <Button onClick={demarrer} disabled={actionLoading || (data.colis_count ?? 0) === 0}>
                {actionLoading ? <Spinner /> : <Play className="h-4 w-4" />} Démarrer
              </Button>
            )}
            {data.statut === 'EN_COURS' && (
              <Button onClick={arriver} disabled={actionLoading}>
                {actionLoading ? <Spinner /> : <Flag className="h-4 w-4" />} Arrivée
              </Button>
            )}
            {!cloturee && (
              <Button variant="outline" onClick={annuler} disabled={actionLoading}>
                <Ban className="h-4 w-4" /> Annuler
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-brand-border p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Truck className="h-3.5 w-3.5" /> Trajet
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-dark">
                {data.agence_depart?.code ?? '—'} → {data.agence_arrivee?.code ?? '—'}
              </p>
              <p className="text-xs text-slate-500">{data.mode_transport}</p>
            </div>
            <div className="rounded-lg border border-brand-border p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <User className="h-3.5 w-3.5" /> Transporteur
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-dark">{data.transporteur ?? '—'}</p>
              <p className="text-xs text-slate-500">
                {data.chauffeur_nom ? `${data.chauffeur_nom}${data.chauffeur_telephone ? ` · ${data.chauffeur_telephone}` : ''}` : 'Chauffeur non renseigné'}
              </p>
            </div>
            <div className="rounded-lg border border-brand-border p-3">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" /> Dates
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-dark">Départ : {formatDateTime(data.date_depart)}</p>
              <p className="text-xs text-slate-500">
                Prévue : {formatDateTime(data.date_arrivee_prevue)} · Réelle : {formatDateTime(data.date_arrivee_reelle)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Colis chargés ({colisCharges.length})</CardTitle>
            <CardDescription>Colis transportés par ce convoi.</CardDescription>
          </div>
          {colisCharges.length > 0 && (
            <Button variant="outline" onClick={decharger} disabled={actionLoading || aDecharger.size === 0}>
              {actionLoading ? <Spinner /> : <PackageMinus className="h-4 w-4" />} Décharger ({aDecharger.size})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {colisCharges.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun colis chargé. Utilisez la liste ci-dessous pour charger des colis.</p>
          ) : (
            <ul className="divide-y divide-brand-border rounded-lg border border-brand-border">
              {colisCharges.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-brand-border text-brand-red"
                    checked={aDecharger.has(c.id)}
                    onChange={() => toggleId(aDecharger, c.id, setADecharger)}
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/colis/${c.id}`} className="font-mono text-sm font-semibold text-brand-dark hover:text-brand-red">
                      {c.numero_suivi}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {c.nom_destinataire} · {formatKg(c.poids_kg)} · Chargé le {formatDateTime(c.pivot?.date_chargement)}
                    </p>
                  </div>
                  <Badge className={STATUT_COLIS_STYLE[c.statut as StatutColis] ?? ''}>{c.statut}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Colis disponibles à charger</CardTitle>
              <CardDescription>
                Colis de {data.agence_depart?.code ?? '—'} vers {data.agence_arrivee?.code ?? '—'} prêts à partir.
              </CardDescription>
            </div>
            {!cloturee && (
              <Button onClick={charger} disabled={actionLoading || aCharger.size === 0}>
                {actionLoading ? <Spinner /> : <PackagePlus className="h-4 w-4" />} Charger ({aCharger.size})
              </Button>
            )}
          </div>
          {!cloturee && (
            <div className="relative pt-1">
              <Search className="absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par n° de suivi, destinataire ou agence…"
                className="pl-9"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {cloturee ? (
            <p className="py-6 text-center text-sm text-slate-400">Cette expédition est clôturée : plus aucun chargement possible.</p>
          ) : dispoFiltres.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {disponibles.length === 0
                ? 'Aucun colis ne correspond à ce trajet pour le moment.'
                : 'Aucun résultat pour cette recherche.'}
            </p>
          ) : (
            <ul className="max-h-96 divide-y divide-brand-border overflow-y-auto rounded-lg border border-brand-border">
              {dispoFiltres.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-brand-border text-brand-red"
                    checked={aCharger.has(c.id)}
                    onChange={() => toggleId(aCharger, c.id, setACharger)}
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/colis/${c.id}`} className="font-mono text-sm font-semibold text-brand-dark hover:text-brand-red">
                      {c.numero_suivi}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {c.nom_destinataire} · {formatKg(c.poids_kg)}
                    </p>
                  </div>
                  <Badge className={STATUT_COLIS_STYLE[c.statut as StatutColis] ?? ''}>{c.statut}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog {...dialog} />
    </div>
  )
}
