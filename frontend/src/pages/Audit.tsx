import { useState } from 'react'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'

interface AuditRow {
  id: number
  user?: { nom: string; prenom: string } | null
  agence?: { nom: string } | null
  action: string
  table_cible: string | null
  id_cible: number | null
  adresse_ip: string | null
  created_at: string
}

export function Audit() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, setPage } = useList<AuditRow>('/journaux-activites', { search }, [search])

  const columns: Column<AuditRow>[] = [
    { key: 'action', header: 'Action', render: (r) => <Badge variant="outline">{r.action}</Badge> },
    { key: 'user', header: 'Utilisateur', render: (r) => (r.user ? `${r.user.prenom ?? ''} ${r.user.nom}` : '—') },
    { key: 'agence', header: 'Agence', render: (r) => r.agence?.nom ?? '—' },
    { key: 'table_cible', header: 'Table', render: (r) => r.table_cible ?? '—' },
    { key: 'id_cible', header: 'Cible', render: (r) => (r.id_cible != null ? `#${r.id_cible}` : '—') },
    { key: 'adresse_ip', header: 'IP', render: (r) => r.adresse_ip ?? '—' },
    { key: 'created_at', header: 'Date', render: (r) => formatDateTime(r.created_at) },
  ]

  return (
    <div className="page-container">
      <PageHeader title="Audit" description="Journal des activités (journaux_activites)." />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Rechercher (action, table cible)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune activité"
          emptyDescription={search ? 'Aucune activité ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
