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
import { formatMoney } from '@/lib/format'

interface CaisseRow {
  id: number
  agence?: { nom: string } | null
  code: string
  libelle: string
  devise_code: string
  solde_initial: string
  actif: boolean
}

export function Caisses() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<CaisseRow>('/caisses', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/caisses/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<CaisseRow>[] = [
    { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (r) => r.code },
    { key: 'libelle', header: 'Libellé', render: (r) => <span className="font-medium">{r.libelle}</span> },
    { key: 'agence', header: 'Agence', render: (r) => r.agence?.nom ?? '—' },
    { key: 'devise_code', header: 'Devise', render: (r) => r.devise_code },
    { key: 'solde_initial', header: 'Solde initial', render: (r) => formatMoney(r.solde_initial, r.devise_code) },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/caisses/${r.id}`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Caisses"
        description="Caisses par agence et devise."
        actions={
          <Button asChild>
            <Link to="/caisses/nouveau"><Plus className="h-4 w-4" /> Nouvelle caisse</Link>
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
          placeholder="Rechercher (code, libellé, agence)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune caisse"
          emptyDescription={search ? 'Aucune caisse ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
