import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api, buildQuery } from '@/lib/api'
import { formatMoney, formatDateTime } from '@/lib/format'
import { STATUTS_COLIS, STATUT_COLIS_STYLE, MODE_FACTURATION_LABEL, type StatutColis } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { RowActions } from '@/components/RowActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Colis, PaginationMeta } from '@/types'

export function ColisList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Colis[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get<Colis[]>(`/colis${buildQuery({ search, statut, page, per_page: 15 })}`)
      .then((res) => {
        if (!active) return
        setItems(res.data)
        setMeta(res.meta ?? null)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [search, statut, page, reload])

  async function del(id: number) {
    try {
      await api.delete(`/colis/${id}`)
      setReload((r) => r + 1)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Colis"
        description="Gestion et suivi de tous les colis enregistrés."
        actions={
          <Button onClick={() => navigate('/colis/nouveau')}>
            <Plus className="h-4 w-4" /> Nouveau colis
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Rechercher (suivi, expéditeur, destinataire, téléphone)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statut}
          onValueChange={(v) => {
            setStatut(v === 'all' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {STATUTS_COLIS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucun colis trouvé"
            description="Modifiez vos filtres ou créez un nouveau colis."
            action={
              <Button onClick={() => navigate('/colis/nouveau')}>
                <Plus className="h-4 w-4" /> Nouveau colis
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° suivi</TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Trajet</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Déposé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs font-semibold">{c.numero_suivi}</TableCell>
                    <TableCell>
                      <p className="font-medium">{c.nom_destinataire}</p>
                      <p className="text-xs text-slate-500">{c.telephone_destinataire}</p>
                    </TableCell>
                    <TableCell>
                      <p>{c.nom_expediteur}</p>
                      <p className="text-xs text-slate-500">{c.telephone_expediteur}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs">
                        {c.agence_depot?.code} → {c.agence_destination?.code}
                      </p>
                      <p className="text-xs text-slate-400">{MODE_FACTURATION_LABEL[c.mode_facturation] ?? c.mode_facturation}</p>
                    </TableCell>
                    <TableCell>{formatMoney(c.montant_transport, c.devise_paiement)}</TableCell>
                    <TableCell>
                      <Badge className={STATUT_COLIS_STYLE[c.statut as StatutColis] ?? ''}>{c.statut}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(c.date_depot)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions viewTo={`/colis/${c.id}`} editTo={`/colis/${c.id}/modifier`} onDelete={() => del(c.id)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {meta && <Pagination meta={meta} onPageChange={setPage} />}
          </>
        )}
      </div>
    </div>
  )
}
