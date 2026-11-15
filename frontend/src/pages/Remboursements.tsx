import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { SearchInput } from '@/components/SearchInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, formatDateTime } from '@/lib/format'

interface RemboursementRow {
  id: number
  paiement?: { reference_paiement: string } | null
  montant: string
  motif: string
  statut: string
  date_remboursement: string
}

const statutStyle: Record<string, string> = {
  DEMANDE: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-cyan-100 text-cyan-700',
  REJETE: 'bg-red-100 text-red-700',
  EFFECTUE: 'bg-emerald-100 text-emerald-700',
}

export function Remboursements() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<RemboursementRow>('/remboursements', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/remboursements/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<RemboursementRow>[] = [
    { key: 'paiement', header: 'Paiement', className: 'font-mono text-xs', render: (r) => r.paiement?.reference_paiement ?? '—' },
    { key: 'montant', header: 'Montant', render: (r) => formatMoney(r.montant, 'CDF') },
    { key: 'motif', header: 'Motif' },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={statutStyle[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'date_remboursement', header: 'Date', render: (r) => formatDateTime(r.date_remboursement) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/remboursements/${r.id}`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Remboursements"
        description="Gestion des remboursements."
        actions={
          <Button asChild>
            <Link to="/remboursements/nouveau"><Plus className="h-4 w-4" /> Nouveau remboursement</Link>
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
          placeholder="Rechercher (motif, payeur, référence de paiement)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucun remboursement"
          emptyDescription={search ? 'Aucun remboursement ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
