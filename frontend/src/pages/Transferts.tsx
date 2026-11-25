import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Send, PackageCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useList } from '@/lib/useList'
import { DataTable, type Column } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { RowActions } from '@/components/RowActions'
import { SearchInput } from '@/components/SearchInput'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MessageDialog } from '@/components/MessageDialog'
import { useConfirm } from '@/lib/useConfirm'
import { useMessage } from '@/lib/useMessage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

interface TransfertRow {
  id: number
  colis?: { id: number; numero_suivi: string } | null
  agence_depart?: { nom: string } | null
  agence_arrivee?: { nom: string } | null
  statut: string
  date_transfert: string
  date_reception: string | null
}

export function Transferts() {
  const [search, setSearch] = useState('')
  const { confirm, dialog } = useConfirm()
  const { show, dialog: messageDialog } = useMessage()
  const { items, meta, loading, refresh, setPage } = useList<TransfertRow>('/transferts', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/transferts/${id}`)
      refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Erreur.', { title: 'Suppression impossible' })
    }
  }

  async function expedier(id: number) {
    try {
      await api.post(`/transferts/${id}/expedier`)
      refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Erreur.', { title: 'Expédition impossible' })
    }
  }

  async function recevoir(id: number) {
    try {
      await api.post(`/transferts/${id}/recevoir`)
      refresh()
    } catch (e) {
      show(e instanceof Error ? e.message : 'Erreur.', { title: 'Réception impossible' })
    }
  }

  function demanderExpedier(id: number) {
    confirm(
      { title: 'Expédier ce transfert ?', description: 'Le colis passera en transit vers l\'agence d\'arrivée.', confirmLabel: 'Expédier' },
      () => expedier(id),
    )
  }

  function demanderRecevoir(id: number) {
    confirm(
      { title: 'Réceptionner ce transfert ?', description: 'Le colis sera marqué comme arrivé en agence.', confirmLabel: 'Recevoir' },
      () => recevoir(id),
    )
  }

  const columns: Column<TransfertRow>[] = [
    { key: 'colis', header: 'Colis', className: 'font-mono text-xs', render: (r) => r.colis?.numero_suivi ?? '—' },
    { key: 'depart', header: 'Départ', render: (r) => r.agence_depart?.nom ?? '—' },
    { key: 'arrivee', header: 'Arrivée', render: (r) => r.agence_arrivee?.nom ?? '—' },
    { key: 'statut', header: 'Statut', render: (r) => <Badge variant="outline">{r.statut}</Badge> },
    { key: 'date_transfert', header: 'Transféré le', render: (r) => formatDateTime(r.date_transfert) },
    { key: 'date_reception', header: 'Reçu le', render: (r) => formatDateTime(r.date_reception) },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.statut === 'EN_ATTENTE' && (
            <Button variant="ghost" size="icon" title="Expédier" onClick={() => demanderExpedier(r.id)}>
              <Send className="h-4 w-4 text-brand-cyan" />
            </Button>
          )}
          {r.statut === 'EXPEDIE' && (
            <Button variant="ghost" size="icon" title="Recevoir" onClick={() => demanderRecevoir(r.id)}>
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            </Button>
          )}
          <RowActions viewTo={r.colis ? `/colis/${r.colis.id}` : undefined} editTo={`/transferts/${r.id}`} onDelete={() => del(r.id)} />
        </div>
      ),
    },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Transferts"
        description="Transferts de colis inter-agences."
        actions={
          <Button asChild>
            <Link to="/transferts/nouveau"><Plus className="h-4 w-4" /> Nouveau transfert</Link>
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
          placeholder="Rechercher (n° de colis, agence de départ ou d'arrivée)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucun transfert"
          emptyDescription={search ? 'Aucun transfert ne correspond à votre recherche.' : undefined}
        />
      </div>

      <ConfirmDialog {...dialog} />
      <MessageDialog {...messageDialog} />
    </div>
  )
}
