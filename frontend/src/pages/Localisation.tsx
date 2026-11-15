import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api, buildQuery } from '@/lib/api'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Province, Ville, Commune, PaginationMeta } from '@/types'

type Tab = 'provinces' | 'villes' | 'communes'
type Row = Province | Ville | Commune

const TABS: { key: Tab; label: string; singular: string }[] = [
  { key: 'provinces', label: 'Provinces', singular: 'province' },
  { key: 'villes', label: 'Villes', singular: 'ville' },
  { key: 'communes', label: 'Communes', singular: 'commune' },
]

const PER_PAGE = 15

export function Localisation() {
  const [tab, setTab] = useState<Tab>('provinces')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Row[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get<Row[]>(`/${tab}${buildQuery({ search, page, per_page: PER_PAGE })}`)
      .then((res) => {
        if (!active) return
        setItems(res.data)
        setMeta(res.meta ?? null)
      })
      .catch(() => {
        if (active) {
          setItems([])
          setMeta(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab, page, search, reload])

  function changeTab(next: Tab) {
    setTab(next)
    setPage(1)
    setSearch('')
  }

  async function del(path: string) {
    try {
      await api.delete(path)
      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1)
      } else {
        setReload((r) => r + 1)
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const provinceColumns: Column<Province>[] = [
    { key: 'code', header: 'Code', className: 'font-mono text-xs', render: (r) => r.code },
    { key: 'nom', header: 'Nom', render: (r) => <span className="font-medium">{r.nom}</span> },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/localisation/provinces/${r.id}`} onDelete={() => del(`/provinces/${r.id}`)} /> },
  ]

  const villeColumns: Column<Ville>[] = [
    { key: 'nom', header: 'Ville', render: (r) => <span className="font-medium">{r.nom}</span> },
    { key: 'province', header: 'Province', render: (r) => r.province?.nom ?? '—' },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/localisation/villes/${r.id}`} onDelete={() => del(`/villes/${r.id}`)} /> },
  ]

  const communeColumns: Column<Commune>[] = [
    { key: 'nom', header: 'Commune', render: (r) => <span className="font-medium">{r.nom}</span> },
    { key: 'ville', header: 'Ville', render: (r) => r.ville?.nom ?? '—' },
    { key: 'province', header: 'Province', render: (r) => r.ville?.province?.nom ?? '—' },
    { key: 'actif', header: 'Statut', render: (r) => (r.actif ? <Badge variant="success">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/localisation/communes/${r.id}`} onDelete={() => del(`/communes/${r.id}`)} /> },
  ]

  const current = TABS.find((t) => t.key === tab)!

  return (
    <div className="page-container">
      <PageHeader
        title="Localisation"
        description="Provinces, villes et communes."
        actions={
          <Button asChild>
            <Link to={`/localisation/${tab}/nouveau`}>
              <Plus className="h-4 w-4" /> Ajouter
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand-red text-white' : 'bg-white text-brand-dark hover:bg-brand-grayLight'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={`Rechercher une ${current.singular}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : tab === 'provinces' ? (
          <DataTable
            columns={provinceColumns}
            rows={items as Province[]}
            meta={meta}
            loading={false}
            onPageChange={setPage}
            emptyTitle="Aucune province"
            emptyDescription="Ajoutez une province pour commencer."
          />
        ) : tab === 'villes' ? (
          <DataTable
            columns={villeColumns}
            rows={items as Ville[]}
            meta={meta}
            loading={false}
            onPageChange={setPage}
            emptyTitle="Aucune ville"
            emptyDescription="Ajoutez une ville pour commencer."
          />
        ) : (
          <DataTable
            columns={communeColumns}
            rows={items as Commune[]}
            meta={meta}
            loading={false}
            onPageChange={setPage}
            emptyTitle="Aucune commune"
            emptyDescription="Ajoutez une commune pour commencer."
          />
        )}
      </div>
    </div>
  )
}
