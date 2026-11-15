import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { SearchInput } from '@/components/SearchInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Parametre {
  id: number
  cle: string
  valeur: string | null
  description: string | null
}

export function Parametres() {
  const [items, setItems] = useState<Parametre[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api
      .get<Parametre[]>('/parametres')
      .then((r) => {
        setItems(r.data)
        setDrafts(Object.fromEntries(r.data.map((p) => [p.id, p.valeur ?? ''])))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save(id: number) {
    setSaving(id)
    try {
      await api.put(`/parametres/${id}`, { valeur: drafts[id] })
    } catch {
      // ignore
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="page-container">
      <PageHeader title="Paramètres Globaux" description="Configuration de l'application." />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une clé ou une description…" />
      </div>

      <div className="rounded-xl border border-brand-border bg-white shadow-card">
        {loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Clé</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.filter((p) => !search.trim() || [p.cle, p.description ?? '', p.valeur ?? ''].some((v) => v.toLowerCase().includes(search.trim().toLowerCase()))).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold">{p.cle}</TableCell>
                  <TableCell>
                    <Input value={drafts[p.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} />
                  </TableCell>
                  <TableCell className="text-slate-500">{p.description ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => save(p.id)} disabled={saving === p.id}>
                      {saving === p.id ? <Spinner /> : <Save className="h-4 w-4" />} Enregistrer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
