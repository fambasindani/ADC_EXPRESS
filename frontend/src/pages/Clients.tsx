import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { useList } from '@/lib/useList'
import { TYPE_CLIENT_LABEL } from '@/lib/constants'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { RowActions } from '@/components/RowActions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Client } from '@/types'

export function Clients() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<Client>('/clients', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/clients/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<Client>[] = [
    { key: 'code_client', header: 'Code', className: 'font-mono text-xs', render: (r) => r.code_client },
    { key: 'nom_ou_raison_sociale', header: 'Nom', render: (r) => <span className="font-medium">{r.nom_ou_raison_sociale}</span> },
    { key: 'type_client', header: 'Type', render: (r) => <Badge variant="outline">{TYPE_CLIENT_LABEL[r.type_client] ?? r.type_client}</Badge> },
    { key: 'telephone', header: 'Téléphone', render: (r) => r.telephone },
    { key: 'email', header: 'E-mail', render: (r) => r.email ?? '—' },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => <RowActions editTo={`/clients/${r.id}`} onDelete={() => del(r.id)} />,
    },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Clients"
        description="Expéditeurs et entreprises."
        actions={
          <Button asChild>
            <Link to="/clients/nouveau"><Plus className="h-4 w-4" /> Nouveau client</Link>
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable columns={columns} rows={items} meta={meta} loading={loading} onPageChange={setPage} emptyTitle="Aucun client" />
      </div>
    </div>
  )
}
