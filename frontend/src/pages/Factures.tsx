import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { SearchInput } from '@/components/SearchInput'
import { PdfIconButton } from '@/components/pdf/PdfIconButton'
import { downloadFacturePdf } from '@/components/pdf/FacturePdf'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDateTime } from '@/lib/format'

interface FactureRow {
  id: number
  numero_facture: string
  colis?: { id: number; numero_suivi: string } | null
  montant_total: string
  devise_code: string
  statut: string
  date_facture: string
}

const statutStyle: Record<string, string> = {
  BROUILLON: 'bg-slate-100 text-slate-700',
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  PARTIELLE: 'bg-cyan-100 text-cyan-700',
  PAYEE: 'bg-emerald-100 text-emerald-700',
  ANNULEE: 'bg-red-100 text-red-700',
  REMBOURSEE: 'bg-orange-100 text-orange-700',
}

export function Factures() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<FactureRow>('/factures', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/factures/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<FactureRow>[] = [
    { key: 'numero_facture', header: 'N° facture', className: 'font-mono text-xs', render: (r) => r.numero_facture },
    { key: 'colis', header: 'Colis', className: 'font-mono text-xs', render: (r) => r.colis?.numero_suivi ?? '—' },
    { key: 'montant_total', header: 'Montant', render: (r) => formatMoney(r.montant_total, r.devise_code) },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={statutStyle[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'date_facture', header: 'Date', render: (r) => formatDateTime(r.date_facture) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <PdfIconButton onDownload={() => downloadFacturePdf(r.id)} title="Télécharger la facture" />
        <RowActions viewTo={r.colis ? `/colis/${r.colis.id}` : undefined} editTo={`/factures/${r.id}`} onDelete={() => del(r.id)} />
      </div>
    ) },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Factures"
        description="Facturation des colis."
        actions={
          <Button asChild>
            <Link to="/factures/nouveau"><Plus className="h-4 w-4" /> Nouvelle facture</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Rechercher (n° de facture, n° de colis, expéditeur)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune facture"
          emptyDescription={search ? 'Aucune facture ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
