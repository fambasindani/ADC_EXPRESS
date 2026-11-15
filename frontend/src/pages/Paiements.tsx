import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { PdfIconButton } from '@/components/pdf/PdfIconButton'
import { downloadRecuPaiementPdf } from '@/components/pdf/RecuPaiementPdf'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney, formatDateTime } from '@/lib/format'
import { STATUT_PAIEMENT_STYLE } from '@/lib/constants'

interface PaiementRow {
  id: number
  reference_paiement: string
  colis?: { id: number; numero_suivi: string } | null
  mode_paiement?: { libelle: string } | null
  montant: string
  devise_code: string
  moment_paiement: string
  statut: string
  date_paiement: string
}

export function Paiements() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<PaiementRow>('/paiements', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/paiements/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<PaiementRow>[] = [
    { key: 'reference_paiement', header: 'Référence', className: 'font-mono text-xs', render: (r) => r.reference_paiement },
    { key: 'colis', header: 'Colis', className: 'font-mono text-xs', render: (r) => r.colis?.numero_suivi ?? '—' },
    { key: 'mode', header: 'Mode', render: (r) => r.mode_paiement?.libelle ?? '—' },
    { key: 'montant', header: 'Montant', render: (r) => formatMoney(r.montant, r.devise_code) },
    { key: 'moment_paiement', header: 'Moment', render: (r) => r.moment_paiement },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={STATUT_PAIEMENT_STYLE[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'date_paiement', header: 'Date', render: (r) => formatDateTime(r.date_paiement) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <PdfIconButton onDownload={() => downloadRecuPaiementPdf(r.id)} title="Télécharger le reçu" />
        <RowActions viewTo={r.colis ? `/colis/${r.colis.id}` : undefined} editTo={`/paiements/${r.id}`} onDelete={() => del(r.id)} />
      </div>
    ) },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Paiements"
        description="Encaissements des colis."
        actions={
          <Button asChild>
            <Link to="/paiements/nouveau"><Plus className="h-4 w-4" /> Encaisser</Link>
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable columns={columns} rows={items} meta={meta} loading={loading} onPageChange={setPage} emptyTitle="Aucun paiement" />
      </div>
    </div>
  )
}
