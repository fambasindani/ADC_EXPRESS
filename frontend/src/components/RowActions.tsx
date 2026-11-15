import { Link } from 'react-router-dom'
import { Eye, Pencil, Trash2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/lib/useConfirm'

interface RowActionsProps {
  viewTo?: string
  editTo?: string
  permissionsTo?: string
  onDelete?: () => void | Promise<void>
  deleteTitle?: string
  deleteDescription?: string
}

export function RowActions({
  viewTo,
  editTo,
  permissionsTo,
  onDelete,
  deleteTitle = 'Supprimer cet élément ?',
  deleteDescription = 'Cette action est irréversible.',
}: RowActionsProps) {
  const { confirm, dialog } = useConfirm()

  function handleDelete() {
    if (!onDelete) return
    confirm(
      { title: deleteTitle, description: deleteDescription, variant: 'danger', confirmLabel: 'Supprimer' },
      onDelete,
    )
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {viewTo && (
          <Button variant="ghost" size="icon" asChild title="Voir">
            <Link to={viewTo}>
              <Eye className="h-4 w-4 text-slate-500" />
            </Link>
          </Button>
        )}
        {editTo && (
          <Button variant="ghost" size="icon" asChild title="Modifier">
            <Link to={editTo}>
              <Pencil className="h-4 w-4 text-brand-cyan" />
            </Link>
          </Button>
        )}
        {permissionsTo && (
          <Button variant="ghost" size="icon" asChild title="Permissions">
            <Link to={permissionsTo}>
              <KeyRound className="h-4 w-4 text-brand-orange" />
            </Link>
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="icon" onClick={handleDelete} title="Supprimer">
            <Trash2 className="h-4 w-4 text-brand-red" />
          </Button>
        )}
      </div>
      <ConfirmDialog {...dialog} />
    </>
  )
}
