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
import { formatMoney, formatDate } from '@/lib/format'

interface TarifRow {
  id: number
  agence_origine?: { nom: string } | null
  agence_destination?: { nom: string } | null
  service?: { libelle: string } | null
  devise_code: string
  prix_base: string
  prix_kg: string
  date_debut: string
  date_fin: string | null
  actif: boolean
}

export function Tarifs() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<TarifRow>('/tarifs', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/tarifs/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<TarifRow>[] = [
    { key: 'origine', header: 'Origine', render: (r) => r.agence_origine?.nom ?? 'Toutes' },
    { key: 'destination', header: 'Destination', render: (r) => r.agence_destination?.nom ?? 'Toutes' },
    { key: 'service', header: 'Service', render: (r) => r.service?.libelle ?? '—' },
    { key: 'prix_base', header: 'Prix base', render: (r) => formatMoney(r.prix_base, r.devise_code) },
    { key: 'prix_kg', header: 'Prix / kg', render: (r) => formatMoney(r.prix_kg, r.devise_code) },
    { key: 'date_debut', header: 'Début', render: (r) => formatDate(r.date_debut) },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/tarifs/${r.id}`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Tarifs"
        description="Grille tarifaire par route, service et devise."
        actions={
          <Button asChild>
            <Link to="/tarifs/nouveau"><Plus className="h-4 w-4" /> Nouveau tarif</Link>
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
          placeholder="Rechercher (agence d'origine/destination, service)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucun tarif"
          emptyDescription={search ? 'Aucun tarif ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
