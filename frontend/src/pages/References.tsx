import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TypeColis, ServiceTransport, Devise, ModePaiement } from '@/types'

type Tab = 'types' | 'services' | 'devises' | 'modes'

const TABS: { key: Tab; label: string }[] = [
  { key: 'types', label: 'Types de colis' },
  { key: 'services', label: 'Services de transport' },
  { key: 'devises', label: 'Devises' },
  { key: 'modes', label: 'Modes de paiement' },
]

export function References() {
  const [tab, setTab] = useState<Tab>('types')
  const [types, setTypes] = useState<TypeColis[]>([])
  const [services, setServices] = useState<ServiceTransport[]>([])
  const [devises, setDevises] = useState<Devise[]>([])
  const [modes, setModes] = useState<ModePaiement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [t, s, d, m] = await Promise.all([
        api.get<TypeColis[]>('/types-colis'),
        api.get<ServiceTransport[]>('/services-transport'),
        api.get<Devise[]>('/devises'),
        api.get<ModePaiement[]>('/modes-paiement'),
      ])
      setTypes(t.data)
      setServices(s.data)
      setDevises(d.data)
      setModes(m.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function del(path: string) {
    try {
      await api.delete(path)
      await load()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const typeColumns: Column<TypeColis>[] = [
    { key: 'code', header: 'Code', render: (r) => r.code },
    { key: 'libelle', header: 'Libellé', render: (r) => <span className="font-medium">{r.libelle}</span> },
    { key: 'fragile', header: 'Fragile', render: (r) => (r.fragile ? <Badge variant="warning">Fragile</Badge> : '—') },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/references/types/${r.id}`} onDelete={() => del(`/types-colis/${r.id}`)} /> },
  ]

  const serviceColumns: Column<ServiceTransport>[] = [
    { key: 'code', header: 'Code', render: (r) => r.code },
    { key: 'libelle', header: 'Libellé', render: (r) => <span className="font-medium">{r.libelle}</span> },
    { key: 'delai_indicatif_jours', header: 'Délai (jours)', render: (r) => (r.delai_indicatif_jours != null ? `${r.delai_indicatif_jours} j` : '—') },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/references/services/${r.id}`} onDelete={() => del(`/services-transport/${r.id}`)} /> },
  ]

  const deviseColumns: Column<Devise>[] = [
    { key: 'code', header: 'Code', render: (r) => <span className="font-mono font-semibold">{r.code}</span> },
    { key: 'nom', header: 'Nom', render: (r) => r.nom },
    { key: 'symbole', header: 'Symbole', render: (r) => r.symbole },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/references/devises/${r.code}`} onDelete={() => del(`/devises/${r.code}`)} /> },
  ]

  const modeColumns: Column<ModePaiement>[] = [
    { key: 'code', header: 'Code', render: (r) => r.code },
    { key: 'libelle', header: 'Libellé', render: (r) => <span className="font-medium">{r.libelle}</span> },
    { key: 'categorie', header: 'Catégorie', render: (r) => r.categorie },
    { key: 'operateur', header: 'Opérateur', render: (r) => r.operateur ?? '—' },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions editTo={`/references/modes/${r.id}`} onDelete={() => del(`/modes-paiement/${r.id}`)} /> },
  ]

  const q = search.trim().toLowerCase()
  const match = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => (f ?? '').toLowerCase().includes(q))

  // Les référentiels sont chargés en entier : le filtre est appliqué côté client.
  const filteredTypes = useMemo(
    () => types.filter((r) => match(r.code, r.libelle)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [types, q],
  )
  const filteredServices = useMemo(
    () => services.filter((r) => match(r.code, r.libelle)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services, q],
  )
  const filteredDevises = useMemo(
    () => devises.filter((r) => match(r.code, r.nom, r.symbole)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devises, q],
  )
  const filteredModes = useMemo(
    () => modes.filter((r) => match(r.code, r.libelle, r.categorie, r.operateur)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modes, q],
  )

  return (
    <div className="page-container">
      <PageHeader
        title="Référentiels"
        description="Types de colis, services de transport, devises et modes de paiement."
        actions={
          <Button asChild>
            <Link to={`/references/${tab}/nouveau`}>
              <Plus className="h-4 w-4" /> Ajouter
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-brand-red text-white' : 'bg-white text-brand-dark hover:bg-brand-grayLight'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher dans ce référentiel…"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : tab === 'types' ? (
          <DataTable columns={typeColumns} rows={filteredTypes} meta={null} loading={false} onPageChange={() => {}} emptyTitle="Aucune donnée" />
        ) : tab === 'services' ? (
          <DataTable columns={serviceColumns} rows={filteredServices} meta={null} loading={false} onPageChange={() => {}} emptyTitle="Aucune donnée" />
        ) : tab === 'devises' ? (
          <DataTable columns={deviseColumns} rows={filteredDevises} meta={null} loading={false} onPageChange={() => {}} emptyTitle="Aucune donnée" />
        ) : (
          <DataTable columns={modeColumns} rows={filteredModes} meta={null} loading={false} onPageChange={() => {}} emptyTitle="Aucune donnée" />
        )}
      </div>
    </div>
  )
}
