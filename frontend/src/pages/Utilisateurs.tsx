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
import { STATUT_USER_STYLE } from '@/lib/constants'

interface UserRow {
  id: number
  nom: string
  postnom: string | null
  prenom: string | null
  email: string
  telephone: string | null
  statut: string
  derniere_connexion: string | null
  agence?: { nom: string } | null
  roles?: { nom: string }[]
}

export function Utilisateurs() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<UserRow>('/users', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/users/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: 'nom',
      header: 'Nom',
      render: (r) => (
        <div>
          <p className="font-medium">{[r.prenom, r.postnom, r.nom].filter(Boolean).join(' ')}</p>
          <p className="text-xs text-slate-500">{r.email}</p>
        </div>
      ),
    },
    { key: 'telephone', header: 'Téléphone', render: (r) => r.telephone ?? '—' },
    { key: 'agence', header: 'Agence', render: (r) => r.agence?.nom ?? '—' },
    { key: 'roles', header: 'Rôles', render: (r) => <div className="flex flex-wrap gap-1">{r.roles?.map((role) => <Badge key={role.nom} variant="outline">{role.nom}</Badge>) ?? '—'}</div> },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={STATUT_USER_STYLE[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'derniere_connexion', header: 'Dernière connexion', render: (r) => formatDateTime(r.derniere_connexion) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/utilisateurs/${r.id}`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Utilisateurs"
        description="Agents et administrateurs."
        actions={
          <Button asChild>
            <Link to="/utilisateurs/nouveau"><Plus className="h-4 w-4" /> Nouvel utilisateur</Link>
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
          placeholder="Rechercher (nom, prénom, e-mail, téléphone)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucun utilisateur"
          emptyDescription={search ? 'Aucun utilisateur ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
