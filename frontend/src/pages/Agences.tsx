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

interface AgenceRow {
  id: number
  code: string
  nom: string
  type_agence: string
  ville?: { nom: string } | null
  telephone?: string | null
  actif: boolean
}

const typeStyle: Record<string, string> = {
  SIEGE: 'bg-brand-red text-white',
  PRINCIPALE: 'bg-brand-cyan text-white',
  SECONDAIRE: 'bg-slate-100 text-slate-700',
  POINT_RELAIS: 'bg-brand-orange text-white',
}

export function Agences() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<AgenceRow>('/agences', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/agences/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<AgenceRow>[] = [
    { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (r) => r.code },
    { key: 'nom', header: 'Nom', render: (r) => <span className="font-medium">{r.nom}</span> },
    { key: 'type_agence', header: 'Type', render: (r) => <Badge className={typeStyle[r.type_agence] ?? ''}>{r.type_agence}</Badge> },
    { key: 'ville', header: 'Ville', render: (r) => r.ville?.nom ?? '—' },
    { key: 'telephone', header: 'Téléphone', render: (r) => r.telephone ?? '—' },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/agences/${r.id}`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Agences"
        description="Réseau d'agences et points relais."
        actions={
          <Button asChild>
            <Link to="/agences/nouveau"><Plus className="h-4 w-4" /> Nouvelle agence</Link>
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
          placeholder="Rechercher (code, nom, adresse, téléphone)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune agence"
          emptyDescription={search ? 'Aucune agence ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
