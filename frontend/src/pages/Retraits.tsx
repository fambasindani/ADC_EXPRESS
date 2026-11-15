import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { SearchInput } from '@/components/SearchInput'
import { RecuRetraitDownloadLink } from '@/components/pdf/RecuRetraitPdf'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

interface RetraitRow {
  id: number
  colis?: {
    id: number
    numero_suivi: string
    nom_destinataire: string
    nom_expediteur: string
    montant_transport: string | number
    devise_paiement: string
    mode_facturation: string
  } | null
  agence?: { nom: string } | null
  retire_par_nom: string
  retire_par_telephone: string
  date_retrait: string
}

export function Retraits() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, setPage } = useList<RetraitRow>('/retraits', { search }, [search])

  const columns: Column<RetraitRow>[] = [
    { key: 'colis', header: 'Colis', className: 'font-mono text-xs', render: (r) => r.colis?.numero_suivi ?? '—' },
    { key: 'retire_par_nom', header: 'Retiré par' },
    { key: 'retire_par_telephone', header: 'Téléphone' },
    { key: 'agence', header: 'Agence', render: (r) => r.agence?.nom ?? '—' },
    { key: 'date_retrait', header: 'Date', render: (r) => formatDateTime(r.date_retrait) },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <RecuRetraitDownloadLink retrait={r} />
          <RowActions viewTo={r.colis ? `/colis/${r.colis.id}` : undefined} />
        </div>
      ),
    },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Retraits Guichet"
        description="Remise des colis au guichet."
        actions={
          <Button asChild>
            <Link to="/retraits/nouveau"><Plus className="h-4 w-4" /> Nouveau retrait</Link>
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
          placeholder="Rechercher (n° de colis, nom ou téléphone du retirant)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucun retrait"
          emptyDescription={search ? 'Aucun retrait ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
