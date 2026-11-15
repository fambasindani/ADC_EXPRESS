import {
  LayoutDashboard,
  Package,
  Truck,
  ArrowLeftRight,
  PackageCheck,
  Bike,
  Users,
  FileText,
  FileBarChart,
  Wallet,
  Landmark,
  Building2,
  Map,
  Tags,
  Boxes,
  ShieldCheck,
  KeyRound,
  Key,
  Bell,
  ClipboardList,
  Settings,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'

export interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
}

export interface NavSection {
  heading: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Opérations Logistiques',
    items: [
      { to: '/colis', label: 'Colis', icon: Package, permission: 'colis.view' },
      { to: '/expeditions', label: 'Expéditions', icon: Truck, permission: 'expeditions.manage' },
      { to: '/transferts', label: 'Transferts Inter-Agences', icon: ArrowLeftRight, permission: 'transfers.manage' },
      { to: '/retraits', label: 'Retraits Guichet', icon: PackageCheck, permission: 'withdrawals.manage' },
      { to: '/livraisons', label: 'Livraisons Domicile', icon: Bike, permission: 'deliveries.manage' },
    ],
  },
  {
    heading: 'Clientèle & Caisses',
    items: [
      { to: '/clients', label: 'Clients & Expéditeurs', icon: Users, permission: 'clients.view' },
      { to: '/factures', label: 'Facturation', icon: FileText, permission: 'payments.view' },
      { to: '/paiements', label: 'Paiements & Mobile Money', icon: Wallet, permission: 'payments.view' },
      { to: '/caisses', label: 'Caisses', icon: Landmark, permission: 'payments.view' },
    ],
  },
  {
    heading: 'Rapports & Documents',
    items: [
      { to: '/rapports', label: 'États & Rapports PDF', icon: FileBarChart, permission: 'reports.view' },
    ],
  },
  {
    heading: 'Réseau RDC & Tarifs',
    items: [
      { to: '/agences', label: 'Agences RDC', icon: Building2, permission: 'agences.view' },
      { to: '/localisation', label: 'Provinces, Villes & Communes', icon: Map, permission: 'agences.view' },
      { to: '/tarifs', label: 'Tarifs', icon: Tags, permission: 'agences.view' },
      { to: '/references', label: 'Référentiels (Types & Services)', icon: Boxes, permission: 'agences.view' },
    ],
  },
  {
    heading: 'Sécurité & Administration',
    items: [
      { to: '/utilisateurs', label: 'Utilisateurs', icon: ShieldCheck, permission: 'users.view' },
      { to: '/roles', label: 'Rôles & Permissions', icon: KeyRound, permission: 'roles.manage' },
      { to: '/otp', label: 'Codes OTP', icon: Key, permission: 'colis.update' },
      { to: '/notifications', label: 'Logs SMS / WhatsApp', icon: Bell, permission: 'users.view' },
      { to: '/audit', label: 'Audit (Journal)', icon: ClipboardList, permission: 'users.view' },
      { to: '/parametres', label: 'Paramètres Globaux', icon: Settings, permission: 'roles.manage' },
    ],
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-dark text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <Logo size={34} />
          <div className="leading-tight">
            <p className="text-sm font-bold">
              ADC <span className="text-brand-orange">EXPRESS</span>
            </p>
            <p className="text-[11px] text-white/50">Logistique & Colis RDC</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/60 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-red text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Tableau de bord
          </NavLink>

          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-white/40">
                {section.heading}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-brand-red text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-white/40">
          © {new Date().getFullYear()} ADC EXPRESS RDC
        </div>
      </aside>
    </>
  )
}
