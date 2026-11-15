import { Menu, LogOut, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/store/auth'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  onOpenSidebar: () => void
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-brand-border bg-white px-4 sm:px-6">
      <button onClick={onOpenSidebar} className="text-brand-dark lg:hidden">
        <Menu className="h-6 w-6" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        {user?.agence && (
          <div className="hidden items-center gap-2 rounded-lg bg-brand-grayLight px-3 py-1.5 text-xs text-slate-600 sm:flex">
            <span className="font-semibold">{user.agence.nom}</span>
            <span className="text-slate-400">·</span>
            <span>{user.agence.code}</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-brand-red/40">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{getInitials(user?.nom, user?.prenom)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-semibold">{user?.nom_complet}</p>
              <p className="text-xs font-normal text-slate-500">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="h-4 w-4" />
              {user?.roles?.map((r) => r.nom).join(', ')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
