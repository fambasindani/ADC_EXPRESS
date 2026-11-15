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
import { STATUT_LIVRAISON_STYLE } from '@/lib/constants'

interface LivraisonRow {
  id: number
  colis?: { id: number; numero_suivi: string; nom_destinataire: string } | null
  livreur?: { nom: string; prenom: string } | null
  adresse_livraison: string
  statut: string
  date_affectation: string
}

export function Livraisons() {
  const [search, setSearch] = useState('')
  const { items, meta, loading, refresh, setPage } = useList<LivraisonRow>('/livraisons', { search }, [search])

  async function del(id: number) {
    try {
      await api.delete(`/livraisons/${id}`)
      refresh()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Erreur.')
    }
  }

  const columns: Column<LivraisonRow>[] = [
    { key: 'colis', header: 'Colis', className: 'font-mono text-xs', render: (r) => r.colis?.numero_suivi ?? '—' },
    { key: 'destinataire', header: 'Destinataire', render: (r) => r.colis?.nom_destinataire ?? '—' },
    { key: 'livreur', header: 'Livreur', render: (r) => (r.livreur ? `${r.livreur.prenom ?? ''} ${r.livreur.nom}` : '—') },
    { key: 'adresse_livraison', header: 'Adresse' },
    { key: 'statut', header: 'Statut', render: (r) => <Badge className={STATUT_LIVRAISON_STYLE[r.statut] ?? ''}>{r.statut}</Badge> },
    { key: 'date_affectation', header: 'Affectée le', render: (r) => formatDateTime(r.date_affectation) },
    { key: 'actions', header: 'Actions', className: 'text-right', render: (r) => <RowActions viewTo={r.colis ? `/colis/${r.colis.id}` : undefined} editTo={`/livraisons/${r.id}`} onDelete={() => del(r.id)} /> },
  ]

  return (
    <div className="page-container">
      <PageHeader
        title="Livraisons"
        description="Livraisons à domicile."
        actions={
          <Button asChild>
            <Link to="/livraisons/nouveau"><Plus className="h-4 w-4" /> Nouvelle livraison</Link>
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
          placeholder="Rechercher (n° de colis, destinataire, adresse)"
        />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        <DataTable
          columns={columns}
          rows={items}
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          emptyTitle="Aucune livraison"
          emptyDescription={search ? 'Aucune livraison ne correspond à votre recherche.' : undefined}
        />
      </div>
    </div>
  )
}
