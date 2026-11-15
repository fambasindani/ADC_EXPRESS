import { useEffect, useState } from 'react'
import { FileDown, FileSpreadsheet, Info } from 'lucide-react'
import { fetchAllPages } from '@/lib/fetchAll'
import { STATUTS_LIVRAISON } from '@/lib/constants'
import {
  telechargerEtatPdf,
  pdfDate,
  pdfMoney,
  type EtatPdfData,
} from '@/components/pdf/EtatPdf'
import { PageHeader } from '@/components/PageHeader'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Colis } from '@/types'

type EtatKey = 'depots' | 'retraits' | 'livraisons' | 'transferts' | 'paiements'

interface EtatConfig {
  value: EtatKey
  label: string
  titre: string
  description: string
}

const ETATS: EtatConfig[] = [
  {
    value: 'depots',
    label: 'Entrées — Dépôts de colis',
    titre: 'ETAT DES ENTREES - DEPOTS DE COLIS',
    description: 'Tous les colis enregistrés au dépôt sur la période sélectionnée.',
  },
  {
    value: 'retraits',
    label: 'Sorties — Retraits guichet',
    titre: 'ETAT DES SORTIES - RETRAITS GUICHET',
    description: 'Tous les colis remis au guichet sur la période sélectionnée.',
  },
  {
    value: 'livraisons',
    label: 'Sorties — Livraisons à domicile',
    titre: 'ETAT DES SORTIES - LIVRAISONS DOMICILE',
    description: 'Toutes les livraisons affectées aux livreurs sur la période sélectionnée.',
  },
  {
    value: 'transferts',
    label: 'Mouvements — Transferts inter-agences',
    titre: 'ETAT DES MOUVEMENTS - TRANSFERTS INTER-AGENCES',
    description: 'Transferts de colis entre agences (départs et réceptions).',
  },
  {
    value: 'paiements',
    label: 'Encaissements — Paiements',
    titre: 'ETAT DES ENCAISSEMENTS - PAIEMENTS',
    description: 'Paiements enregistrés au dépôt ou au retrait sur la période sélectionnée.',
  },
]

interface AgenceOption {
  id: number
  code: string
  nom: string
}

interface RetraitApi {
  id: number
  colis?: {
    numero_suivi: string
    nom_destinataire: string
    montant_transport: string | number
    devise_paiement: string
  } | null
  agence?: { nom: string } | null
  retire_par_nom: string
  retire_par_telephone: string
  date_retrait: string
}

interface LivraisonApi {
  id: number
  colis?: { numero_suivi: string; nom_destinataire: string } | null
  livreur?: { nom: string; prenom?: string | null } | null
  adresse_livraison: string
  statut: string
  date_affectation: string
  frais_livraison: string | number
  devise?: { code: string } | null
}

interface TransfertApi {
  id: number
  colis?: { numero_suivi: string } | null
  agence_depart?: { code: string; nom: string } | null
  agence_arrivee?: { code: string; nom: string } | null
  expedition?: { reference: string } | null
  remis_par?: { nom: string; prenom?: string | null } | null
  recu_par?: { nom: string; prenom?: string | null } | null
  statut: string
  date_transfert: string
}

interface PaiementApi {
  id: number
  reference_paiement: string
  colis?: { numero_suivi: string } | null
  payeur_nom?: string | null
  mode_paiement?: { libelle: string } | null
  montant: string | number
  devise_code: string
  statut: string
  date_paiement: string
  agence?: { nom: string } | null
}

function inputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nomComplet(p?: { nom: string; prenom?: string | null } | null): string {
  if (!p) return '-'
  return `${p.prenom ?? ''} ${p.nom}`.trim() || '-'
}

function periodeLabel(start: string, end: string): string {
  if (start && end) return `du ${pdfDate(start)} au ${pdfDate(end)}`
  if (start) return `a partir du ${pdfDate(start)}`
  if (end) return `jusqu'au ${pdfDate(end)}`
  return 'toutes les dates'
}

function totalDevise<T>(rows: T[], montant: (r: T) => number | string, devise: (r: T) => string, code: string): number {
  return rows.reduce((sum, r) => sum + (devise(r) === code ? Number(montant(r) || 0) : 0), 0)
}

export function Rapports() {
  const today = new Date()
  const [etat, setEtat] = useState<EtatKey>('depots')
  const [dateStart, setDateStart] = useState(inputDate(new Date(today.getFullYear(), today.getMonth(), 1)))
  const [dateEnd, setDateEnd] = useState(inputDate(today))
  const [agenceId, setAgenceId] = useState('')
  const [statutLivraison, setStatutLivraison] = useState('all')
  const [agences, setAgences] = useState<AgenceOption[]>([])
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchAllPages<AgenceOption>('/agences', { actif: 1 })
      .then(setAgences)
      .catch(() => {})
  }, [])

  const config = ETATS.find((e) => e.value === etat)!
  const showAgence = etat !== 'livraisons'
  const agenceLabel = etat === 'transferts' ? 'Agence de départ' : 'Agence'
  const agenceNom =
    etat === 'livraisons'
      ? 'Selon votre agence'
      : agences.find((a) => String(a.id) === agenceId)?.nom ?? 'Toutes les agences'

  async function generer() {
    setGenerating(true)
    setError(null)
    setSuccess(null)

    const dates = {
      date_start: dateStart || undefined,
      date_end: dateEnd || undefined,
    }
    const periode = periodeLabel(dateStart, dateEnd)

    try {
      let data: EtatPdfData

      if (etat === 'depots') {
        const rows = await fetchAllPages<Colis>('/colis', {
          ...dates,
          agence_depot_id: agenceId || undefined,
          sort_by: 'date_depot',
          sort_dir: 'asc',
        })
        const poids = rows.reduce((s, c) => s + Number(c.poids_kg || 0), 0)
        data = {
          titre: config.titre,
          sousTitre: `${rows.length} depot(s)`,
          periode,
          agence: agenceNom,
          colonnes: [
            { header: 'N° suivi', width: '12%' },
            { header: 'Date depot', width: '9%' },
            { header: 'Expediteur', width: '16%' },
            { header: 'Destinataire', width: '16%' },
            { header: 'Trajet', width: '14%' },
            { header: 'Poids', width: '6%', align: 'right' },
            { header: 'Montant', width: '12%', align: 'right' },
            { header: 'Statut', width: '15%' },
          ],
          lignes: rows.map((c) => [
            c.numero_suivi,
            pdfDate(c.date_depot),
            c.nom_expediteur,
            c.nom_destinataire,
            `${c.agence_depot?.code ?? '-'} -> ${c.agence_destination?.code ?? '-'}`,
            `${Number(c.poids_kg || 0)} kg`,
            pdfMoney(c.montant_transport, c.devise_paiement),
            c.statut,
          ]),
          resume: [
            { label: 'Depots', value: String(rows.length) },
            { label: 'Poids total', value: `${poids.toFixed(2)} kg` },
            { label: 'Total CDF', value: pdfMoney(totalDevise(rows, (c) => c.montant_transport, (c) => c.devise_paiement, 'CDF'), 'CDF') },
            { label: 'Total USD', value: pdfMoney(totalDevise(rows, (c) => c.montant_transport, (c) => c.devise_paiement, 'USD'), 'USD') },
          ],
        }
      } else if (etat === 'retraits') {
        const rows = await fetchAllPages<RetraitApi>('/retraits', {
          ...dates,
          agence_id: agenceId || undefined,
        })
        data = {
          titre: config.titre,
          sousTitre: `${rows.length} retrait(s)`,
          periode,
          agence: agenceNom,
          colonnes: [
            { header: 'N° suivi', width: '12%' },
            { header: 'Destinataire', width: '22%' },
            { header: 'Retire par', width: '20%' },
            { header: 'Telephone', width: '13%' },
            { header: 'Agence', width: '16%' },
            { header: 'Date', width: '9%' },
            { header: 'Montant', width: '8%', align: 'right' },
          ],
          lignes: rows.map((r) => [
            r.colis?.numero_suivi ?? '-',
            r.colis?.nom_destinataire ?? '-',
            r.retire_par_nom,
            r.retire_par_telephone,
            r.agence?.nom ?? '-',
            pdfDate(r.date_retrait),
            pdfMoney(r.colis?.montant_transport ?? 0, r.colis?.devise_paiement),
          ]),
          resume: [
            { label: 'Retraits', value: String(rows.length) },
            { label: 'Total CDF', value: pdfMoney(totalDevise(rows, (r) => r.colis?.montant_transport ?? 0, (r) => r.colis?.devise_paiement ?? 'CDF', 'CDF'), 'CDF') },
            { label: 'Total USD', value: pdfMoney(totalDevise(rows, (r) => r.colis?.montant_transport ?? 0, (r) => r.colis?.devise_paiement ?? 'CDF', 'USD'), 'USD') },
          ],
        }
      } else if (etat === 'livraisons') {
        const rows = await fetchAllPages<LivraisonApi>('/livraisons', {
          ...dates,
          statut: statutLivraison === 'all' ? undefined : statutLivraison,
        })
        data = {
          titre: config.titre,
          sousTitre: `${rows.length} livraison(s)`,
          periode,
          agence: agenceNom,
          colonnes: [
            { header: 'N° suivi', width: '12%' },
            { header: 'Destinataire', width: '20%' },
            { header: 'Livreur', width: '16%' },
            { header: 'Adresse', width: '24%' },
            { header: 'Statut', width: '10%' },
            { header: 'Affectee le', width: '10%' },
            { header: 'Frais', width: '8%', align: 'right' },
          ],
          lignes: rows.map((r) => [
            r.colis?.numero_suivi ?? '-',
            r.colis?.nom_destinataire ?? '-',
            nomComplet(r.livreur),
            r.adresse_livraison,
            r.statut,
            pdfDate(r.date_affectation),
            pdfMoney(r.frais_livraison, r.devise?.code ?? 'CDF'),
          ]),
          resume: [
            { label: 'Livraisons', value: String(rows.length) },
            { label: 'Livrees', value: String(rows.filter((r) => r.statut === 'LIVRE').length) },
            { label: 'Frais CDF', value: pdfMoney(totalDevise(rows, (r) => r.frais_livraison, (r) => r.devise?.code ?? 'CDF', 'CDF'), 'CDF') },
            { label: 'Frais USD', value: pdfMoney(totalDevise(rows, (r) => r.frais_livraison, (r) => r.devise?.code ?? 'CDF', 'USD'), 'USD') },
          ],
        }
      } else if (etat === 'transferts') {
        const rows = await fetchAllPages<TransfertApi>('/transferts', {
          ...dates,
          agence_depart_id: agenceId || undefined,
        })
        data = {
          titre: config.titre,
          sousTitre: `${rows.length} transfert(s)`,
          periode,
          agence: agenceNom,
          colonnes: [
            { header: 'N° suivi', width: '14%' },
            { header: 'Agence depart', width: '17%' },
            { header: 'Agence arrivee', width: '17%' },
            { header: 'Statut', width: '9%' },
            { header: 'Date transfert', width: '13%' },
            { header: 'Remis par', width: '15%' },
            { header: 'Recu par', width: '15%' },
          ],
          lignes: rows.map((r) => [
            r.colis?.numero_suivi ?? '-',
            r.agence_depart?.nom ?? '-',
            r.agence_arrivee?.nom ?? '-',
            r.statut,
            pdfDate(r.date_transfert),
            nomComplet(r.remis_par),
            nomComplet(r.recu_par),
          ]),
          resume: [
            { label: 'Transferts', value: String(rows.length) },
            { label: 'Recus', value: String(rows.filter((r) => r.statut === 'RECU').length) },
            { label: 'En attente', value: String(rows.filter((r) => r.statut === 'EN_ATTENTE').length) },
          ],
        }
      } else {
        const rows = await fetchAllPages<PaiementApi>('/paiements', {
          ...dates,
          agence_id: agenceId || undefined,
          sort_by: 'date_paiement',
          sort_dir: 'asc',
        })
        const valides = rows.filter((r) => r.statut === 'VALIDE')
        data = {
          titre: config.titre,
          sousTitre: `${rows.length} paiement(s)`,
          periode,
          agence: agenceNom,
          colonnes: [
            { header: 'Reference', width: '13%' },
            { header: 'Date', width: '10%' },
            { header: 'Colis', width: '13%' },
            { header: 'Payeur', width: '18%' },
            { header: 'Mode', width: '13%' },
            { header: 'Montant', width: '12%', align: 'right' },
            { header: 'Statut', width: '9%' },
            { header: 'Agence', width: '12%' },
          ],
          lignes: rows.map((r) => [
            r.reference_paiement,
            pdfDate(r.date_paiement),
            r.colis?.numero_suivi ?? '-',
            r.payeur_nom ?? '-',
            r.mode_paiement?.libelle ?? '-',
            pdfMoney(r.montant, r.devise_code),
            r.statut,
            r.agence?.nom ?? '-',
          ]),
          resume: [
            { label: 'Paiements', value: String(rows.length) },
            { label: 'Valides', value: String(valides.length) },
            { label: 'Total CDF', value: pdfMoney(totalDevise(valides, (r) => r.montant, (r) => r.devise_code, 'CDF'), 'CDF') },
            { label: 'Total USD', value: pdfMoney(totalDevise(valides, (r) => r.montant, (r) => r.devise_code, 'USD'), 'USD') },
          ],
        }
      }

      data.fichier = `etat-${etat}-${dateStart || 'debut'}-${dateEnd || 'fin'}.pdf`
      await telechargerEtatPdf(data)
      setSuccess(`État généré : ${data.lignes.length} enregistrement(s).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de générer l’état PDF.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="États & Rapports PDF"
        description="Générez les états d'entrées et de sorties : dépôts, retraits, livraisons, transferts et encaissements."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-brand-red" /> Paramètres du rapport
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Type d'état</Label>
              <Select value={etat} onValueChange={(v) => setEtat(v as EtatKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETATS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Du</Label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Au</Label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>

            {showAgence && (
              <div className="space-y-2">
                <Label>{agenceLabel}</Label>
                <Select value={agenceId || 'all'} onValueChange={(v) => setAgenceId(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les agences</SelectItem>
                    {agences.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.code} — {a.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {etat === 'livraisons' && (
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={statutLivraison} onValueChange={setStatutLivraison}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {STATUTS_LIVRAISON.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Info className="h-4 w-4 shrink-0" /> Maximum 5 000 lignes par état. Affinez la période si nécessaire.
            </p>
            <Button onClick={generer} disabled={generating}>
              {generating ? <Spinner /> : <FileDown className="h-4 w-4" />} Télécharger le PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>États disponibles</CardTitle>
          <CardDescription>Les états reprennent les filtres de période et, lorsque disponible, d'agence.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ETATS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEtat(e.value)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                etat === e.value
                  ? 'border-brand-red bg-red-50'
                  : 'border-brand-border bg-white hover:bg-brand-grayLight'
              }`}
            >
              <p className="text-sm font-semibold text-brand-dark">{e.label}</p>
              <p className="mt-1 text-xs text-slate-500">{e.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
