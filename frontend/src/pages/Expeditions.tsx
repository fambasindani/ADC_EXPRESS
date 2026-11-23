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
import { formatDateTime } from '@/lib/format'
import { STATUT_EXPEDITION_STYLE } from '@/lib/constants'

interface ExpeditionRow {
  id: number
  reference: string
  agence_depart?: { nom: string } | null
  agence_arrivee?: { nom: string } | null
  mode_transport: string
  statut: string
  date_depart: string | null
  date_arrivee_prevue: string | null
}

export function Expeditions() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<ExpeditionRow>('/expeditions', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/expeditions/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<ExpeditionRow>[] = [
    { key: 'reference', header: 'Référence', className: 'font-mono text-xs', render: (r) => r.reference },
    { key: 'depart', header: 'Départ', render: (r) => r.agence_depart?.nom ?? '—' },
    { key: 'arrivee', header: 'Arrivée', render: (r) => r.agence_arrivee?.nom ?? '—' },
    { key: 'mode_transport', header: 'Mode', render: (r) => r.mode_transport },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={STATUT_EXPEDITION_STYLE[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'date_depart', header: 'Départ le', render: (r) => formatDateTime(r.date_depart) },
    { key: 'date_arrivee_prevue', header: 'Arrivée prévue', render: (r) => formatDateTime(r.date_arrivee_prevue) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions viewTo={`/expeditions/${r.id}`} editTo={`/expeditions/${r.id}/modifier`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Expéditions"
        description="Départs inter-agences."
        actions={
          <Button asChild>
            <Link to="/expeditions/nouveau"><Plus className="h-4 w-4" /> Nouvelle expédition</Link>
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
          placeholder="Rechercher (référence, transporteur, chauffeur, agence)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune expédition"
          emptyDescription={search ? 'Aucune expédition ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
