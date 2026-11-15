import { useEffect, useState } from 'react'
import { api, buildQuery } from '@/lib/api'
import type { PaginationMeta } from '@/types'

interface UseListOptions {
  perPage?: number
}

export function useList<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  deps: unknown[] = [],
  options: UseListOptions = {},
) {
  const [items, setItems] = useState<T[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const [page, setPage] = useState(1)

  const perPage = options.perPage ?? 15

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get<T[]>(`${path}${buildQuery({ ...params, page, per_page: perPage })}`)
      .then((res) => {
        if (!active) return
        setItems(res.data)
        setMeta(res.meta ?? null)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, page, reload])

  return { items, meta, loading, page, setPage, refresh: () => setReload((r) => r + 1) }
}
