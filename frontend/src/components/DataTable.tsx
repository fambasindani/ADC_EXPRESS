import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PaginationMeta } from '@/types'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  meta: PaginationMeta | null
  loading: boolean
  onPageChange: (page: number) => void
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  rowKey?: (row: T) => string | number
}

export function DataTable<T>({
  columns,
  rows,
  meta,
  loading,
  onPageChange,
  emptyTitle,
  emptyDescription,
  emptyAction,
  rowKey,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle ?? 'Aucune donnée'} description={emptyDescription} action={emptyAction} />
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={rowKey ? rowKey(row) : idx}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {meta && <Pagination meta={meta} onPageChange={onPageChange} />}
    </>
  )
}
