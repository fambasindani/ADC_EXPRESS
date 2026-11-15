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

interface RoleRow {
  id: number
  code: string
  nom: string
  description: string | null
  actif: boolean
  permissions?: { id: number; code: string }[]
}

export function Roles() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<RoleRow>('/roles', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/roles/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<RoleRow>[] = [
    { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (r) => r.code },
    { key: 'nom', header: 'Nom', render: (r) => <span className="font-medium">{r.nom}</span> },
    { key: 'description', header: 'Description', render: (r) => r.description ?? '—' },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (r) => <Badge variant="outline">{r.permissions?.length ?? 0}</Badge>,
    },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/roles/${r.id}`} permissionsTo={`/roles/${r.id}/permissions`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Rôles & Permissions"
        description="Gestion du RBAC."
        actions={
          <Button asChild>
            <Link to="/roles/nouveau"><Plus className="h-4 w-4" /> Nouveau rôle</Link>
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
          placeholder="Rechercher (code ou nom du rôle)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucun rôle"
          emptyDescription={search ? 'Aucun rôle ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
