import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Save, CheckSquare, Square } from 'lucide-react'
import { api } from '@/lib/api'
import type { Role, Permission } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { BackButton } from '@/components/BackButton'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ModuleGroup {
  module: string
  permissions: Permission[]
}

export function RolePermissionsForm() {
  const { id } = useParams()
  const [role, setRole] = useState<Role | null>(null)
  const [groups, setGroups] = useState<ModuleGroup[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([api.get<Role>(`/roles/${id}`), api.get<Permission[]>('/permissions')])
      .then(([roleRes, permsRes]) => {
        setRole(roleRes.data)
        setSelected(new Set((roleRes.data.permissions ?? []).map((p) => p.id)))

        const all = permsRes.data
        const grouped: Record<string, ModuleGroup> = {}
        for (const p of all) {
          if (!grouped[p.module]) grouped[p.module] = { module: p.module, permissions: [] }
          grouped[p.module].permissions.push(p)
        }
        setGroups(Object.values(grouped).sort((a, b) => a.module.localeCompare(b.module)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const totalSelected = useMemo(() => selected.size, [selected])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(group: ModuleGroup) {
    setSelected((prev) => {
      const next = new Set(prev)
      const allChecked = group.permissions.every((p) => next.has(p.id))
      for (const p of group.permissions) {
        if (allChecked) next.delete(p.id)
        else next.add(p.id)
      }
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(groups.flatMap((g) => g.permissions.map((p) => p.id))))
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function save() {
    if (!id) return
    setSaving(true)
    setMessage(null)
    try {
      await api.put(`/roles/${id}/permissions`, { permissions: Array.from(selected) })
      setMessage({ type: 'success', text: 'Permissions enregistrées avec succès.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={`Permissions du rôle : ${role?.nom ?? ''}`}
        description={`Code : ${role?.code ?? ''} · ${totalSelected} permission(s) sélectionnée(s)`}
        actions={<BackButton to="/roles" />}
      />

      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border border-brand-border bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="h-4 w-4" /> Tout sélectionner
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Square className="h-4 w-4" /> Tout désélectionner
          </Button>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Spinner />}
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => {
          const checkedCount = group.permissions.filter((p) => selected.has(p.id)).length
          const allChecked = checkedCount === group.permissions.length
          return (
            <Card key={group.module}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="capitalize">{group.module}</span>
                  <button onClick={() => toggleGroup(group)} className="text-xs font-medium text-brand-red hover:underline">
                    {allChecked ? 'Tout décocher' : 'Tout cocher'} ({checkedCount}/{group.permissions.length})
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {group.permissions.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-brand-grayLight">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 rounded border-brand-border text-brand-red focus:ring-brand-red/40"
                    />
                    <span className="flex-1 text-sm">{p.nom}</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">{p.code}</Badge>
                  </label>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving && <Spinner />}
          <Save className="h-4 w-4" /> Enregistrer les permissions
        </Button>
      </div>
    </div>
  )
}
