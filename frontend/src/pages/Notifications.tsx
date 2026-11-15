import { useState } from 'react'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/format'

interface NotificationRow {
  id: number
  colis?: { numero_suivi: string } | null
  canal: string
  sujet: string | null
  message: string
  statut: string
  date_envoi: string | null
  created_at: string
}

const statutStyle: Record<string, string> = {
  A_ENVOYER: 'bg-amber-100 text-amber-700',
  ENVOYEE: 'bg-emerald-100 text-emerald-700',
  ECHEC: 'bg-red-100 text-red-700',
  LUE: 'bg-cyan-100 text-cyan-700',
}

export function Notifications() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, setPage } = useList<NotificationRow>('/notifications', { search }, [search])

  const columns: Column<NotificationRow>[] = [
    { key: 'colis', header: 'Colis', className: 'font-mono text-xs', render: (r) => r.colis?.numero_suivi ?? '—' },
    { key: 'canal', header: 'Canal', render: (r) => <Badge variant="outline">{r.canal}</Badge> },
    { key: 'sujet', header: 'Sujet', render: (r) => r.sujet ?? '—' },
    { key: 'message', header: 'Message' },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={statutStyle[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'date_envoi', header: 'Envoyée le', render: (r) => formatDateTime(r.date_envoi ?? r.created_at) },
  ]

  return (
    <div className="page-container">
      <PageHeader title="Logs SMS / WhatsApp" description="Notifications envoyées par canal." />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Rechercher (sujet, message, n° de colis)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune notification"
          emptyDescription={search ? 'Aucune notification ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
