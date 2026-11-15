import { api, buildQuery } from '@/lib/api'

interface FetchAllOptions {
  perPage?: number
  maxRows?: number
}

/**
 * Récupère toutes les lignes d'un endpoint paginé (max 100 par page côté API).
 * Utile pour générer un état PDF à partir des filtres de l'écran.
 */
export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
  options: FetchAllOptions = {},
): Promise<T[]> {
  const perPage = Math.min(Math.max(options.perPage ?? 100, 5), 100)
  const maxRows = options.maxRows ?? 5000
  const rows: T[] = []

  let page = 1
  let lastPage = 1

  do {
    const res = await api.get<T[]>(`${path}${buildQuery({ ...params, page, per_page: perPage })}`)
    rows.push(...res.data)
    lastPage = res.meta?.last_page ?? 1
    page += 1
  } while (page <= lastPage && rows.length < maxRows)

  return rows.slice(0, maxRows)
}
