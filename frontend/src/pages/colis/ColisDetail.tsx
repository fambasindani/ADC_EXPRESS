import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, User, MapPin, Wallet, RefreshCw, History, Pencil, Printer, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatMoney, formatDateTime, formatKg } from '@/lib/format'
import {
  STATUTS_COLIS,
  STATUT_COLIS_STYLE,
  MODE_FACTURATION_LABEL,
  type StatutColis,
} from '@/lib/constants'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BordereauDownloadLink } from '@/components/pdf/BordereauPdf'
import { telechargerEtiquette } from '@/components/pdf/EtiquettePdf'
import { whatsappLien, useWhatsappInfos } from '@/lib/whatsapp'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Colis } from '@/types'

interface HistoriqueRow {
  id: number
  ancien_statut: string | null
  nouveau_statut: string
  commentaire: string | null
  date_evenement: string
  user?: { nom: string; prenom: string } | null
  agence?: { code: string; nom: string } | null
}

export function ColisDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const wa = useWhatsappInfos()
  const [colis, setColis] = useState<Colis | null>(null)
  const [historique, setHistorique] = useState<HistoriqueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [nouveauStatut, setNouveauStatut] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get<Colis>(`/colis/${id}`),
      api.get<HistoriqueRow[]>(`/colis/${id}/historique`),
    ])
      .then(([c, h]) => {
        setColis(c.data)
        setHistorique(h.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function imprimerEtiquette() {
    if (!id || !colis) return
    setPrinting(true)
    setMessage(null)
    try {
      const res = await api.get<{ qr_data_url: string; suivi_url: string }>(`/colis/${id}/etiquette`)
      await telechargerEtiquette(colis, res.data.qr_data_url)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible de générer l'étiquette.")
    } finally {
      setPrinting(false)
    }
  }

  function envoyerWhatsapp() {
    if (!colis) return
    const suivi = wa.suivi_base ? `${wa.suivi_base}/suivi/${colis.numero_suivi}` : null
    const message = `ADC EXPRESS — Votre colis ${colis.numero_suivi} est « ${colis.statut} ».`
      + (suivi ? `\nSuivi : ${suivi}` : '')
    window.open(whatsappLien(colis.telephone_destinataire, message, wa.numero), '_blank', 'noopener')
  }

  async function changerStatut() {
    if (!id || !nouveauStatut) return
    setSaving(true)
    setMessage(null)
    try {
      await api.post(`/colis/${id}/changer-statut`, { nouveau_statut: nouveauStatut, commentaire })
      const [c, h] = await Promise.all([
        api.get<Colis>(`/colis/${id}`),
        api.get<HistoriqueRow[]>(`/colis/${id}/historique`),
      ])
      setColis(c.data)
      setHistorique(h.data)
      setNouveauStatut('')
      setCommentaire('')
      setMessage('Statut mis à jour avec succès.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!colis) {
    return (
      <div className="page-container">
        <Alert variant="error">Colis introuvable.</Alert>
      </div>
    )
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/colis')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-mono text-2xl font-bold text-brand-dark">{colis.numero_suivi}</h1>
            <p className="text-sm text-slate-500">
              {MODE_FACTURATION_LABEL[colis.mode_facturation]} · déposé le {formatDateTime(colis.date_depot)}
            </p>
          </div>
          <Badge className={STATUT_COLIS_STYLE[colis.statut as StatutColis] ?? ''}>{colis.statut}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={envoyerWhatsapp} title={`Envoyer un message WhatsApp au destinataire (${wa.numero})`}>
            <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
          </Button>
          <Button variant="outline" onClick={imprimerEtiquette} disabled={printing}>
            {printing ? <Spinner /> : <Printer className="h-4 w-4" />} Étiquette
          </Button>
          <Button variant="outline" onClick={() => navigate(`/colis/${colis.id}/modifier`)}>
            <Pencil className="h-4 w-4" /> Modifier
          </Button>
        </div>
      </div>

      {message && <Alert variant={message.startsWith('Statut') ? 'success' : 'error'}>{message}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-brand-cyan" /> Expéditeur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{colis.nom_expediteur}</p>
            <p className="text-slate-500">{colis.telephone_expediteur}</p>
            {colis.adresse_expediteur && <p className="text-slate-500">{colis.adresse_expediteur}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-brand-orange" /> Destinataire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{colis.nom_destinataire}</p>
            <p className="text-slate-500">{colis.telephone_destinataire}</p>
            {colis.adresse_destinataire && <p className="text-slate-500">{colis.adresse_destinataire}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-brand-red" /> Trajet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">
              {colis.agence_depot?.nom} → {colis.agence_destination?.nom}
            </p>
            <p className="text-slate-500">
              {colis.type_colis?.libelle} · {formatKg(colis.poids_kg)}
            </p>
            {colis.date_estimee_arrivee && (
              <p className="text-slate-500">Arrivée estimée : {formatDateTime(colis.date_estimee_arrivee)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-emerald-500" /> Paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Montant transport</span>
              <span className="font-semibold">{formatMoney(colis.montant_transport, colis.devise_paiement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Déjà payé</span>
              <span className="font-semibold text-emerald-600">{formatMoney(colis.montant_paye ?? 0, colis.devise_paiement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Solde</span>
              <span className={`font-bold ${(colis.solde ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatMoney(colis.solde ?? 0, colis.devise_paiement)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 text-brand-cyan" /> Changer le statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={nouveauStatut} onValueChange={setNouveauStatut}>
              <SelectTrigger>
                <SelectValue placeholder="Nouveau statut" />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_COLIS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {nouveauStatut === 'LIVRE' && (
              <p className="text-xs text-slate-500">
                La livraison associée sera automatiquement clôturée comme livrée.
              </p>
            )}
            {(nouveauStatut === 'RETIRE' || nouveauStatut === 'ANNULE') && (
              <p className="text-xs text-slate-500">
                La livraison en cours sera automatiquement clôturée.
              </p>
            )}
            <Textarea
              placeholder="Commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
            <Button onClick={changerStatut} disabled={saving || !nouveauStatut} className="w-full">
              {saving && <Spinner />} Appliquer
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-brand-orange" /> Historique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative ml-3 space-y-5 border-l border-brand-border pl-6">
            {historique.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-brand-red" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUT_COLIS_STYLE[h.nouveau_statut as StatutColis] ?? ''}>{h.nouveau_statut}</Badge>
                  <span className="text-xs text-slate-400">{formatDateTime(h.date_evenement)}</span>
                  {h.agence && <span className="text-xs text-slate-500">{h.agence.nom}</span>}
                </div>
                {h.commentaire && <p className="mt-1 text-sm text-slate-600">{h.commentaire}</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <BordereauDownloadLink colis={colis} />
      </div>
    </div>
  )
}
