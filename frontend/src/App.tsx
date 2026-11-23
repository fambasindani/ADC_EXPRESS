import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { AppLayout } from '@/layouts/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { ColisList } from '@/pages/colis/ColisList'
import { ColisForm } from '@/pages/colis/ColisForm'
import { ColisDetail } from '@/pages/colis/ColisDetail'
import { Clients } from '@/pages/Clients'
import { ClientsForm } from '@/pages/ClientsForm'
import { Agences } from '@/pages/Agences'
import { AgencesForm } from '@/pages/AgencesForm'
import { Localisation } from '@/pages/Localisation'
import { ProvinceForm } from '@/pages/ProvinceForm'
import { VilleForm } from '@/pages/VilleForm'
import { CommuneForm } from '@/pages/CommuneForm'
import { Tarifs } from '@/pages/Tarifs'
import { TarifsForm } from '@/pages/TarifsForm'
import { References } from '@/pages/References'
import { TypeColisForm } from '@/pages/TypeColisForm'
import { ServiceTransportForm } from '@/pages/ServiceTransportForm'
import { DeviseForm } from '@/pages/DeviseForm'
import { ModePaiementForm } from '@/pages/ModePaiementForm'
import { Expeditions } from '@/pages/Expeditions'
import { ExpeditionsForm } from '@/pages/ExpeditionsForm'
import { ExpeditionsDetail } from '@/pages/ExpeditionsDetail'
import { Transferts } from '@/pages/Transferts'
import { TransfertsForm } from '@/pages/TransfertsForm'
import { Paiements } from '@/pages/Paiements'
import { PaiementsForm } from '@/pages/PaiementsForm'
import { Factures } from '@/pages/Factures'
import { FacturesForm } from '@/pages/FacturesForm'
import { Remboursements } from '@/pages/Remboursements'
import { RemboursementsForm } from '@/pages/RemboursementsForm'
import { Caisses } from '@/pages/Caisses'
import { CaissesForm } from '@/pages/CaissesForm'
import { Retraits } from '@/pages/Retraits'
import { RetraitsForm } from '@/pages/RetraitsForm'
import { Livraisons } from '@/pages/Livraisons'
import { LivraisonsForm } from '@/pages/LivraisonsForm'
import { Utilisateurs } from '@/pages/Utilisateurs'
import { UtilisateursForm } from '@/pages/UtilisateursForm'
import { Roles } from '@/pages/Roles'
import { RolesForm } from '@/pages/RolesForm'
import { RolePermissionsForm } from '@/pages/RolePermissionsForm'
import { Otp } from '@/pages/Otp'
import { Notifications } from '@/pages/Notifications'
import { Audit } from '@/pages/Audit'
import { Parametres } from '@/pages/Parametres'
import { Rapports } from '@/pages/Rapports'
import { NotFound } from '@/pages/NotFound'

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'colis', element: <ColisList /> },
      { path: 'colis/nouveau', element: <ColisForm /> },
      { path: 'colis/:id/modifier', element: <ColisForm /> },
      { path: 'colis/:id', element: <ColisDetail /> },
      { path: 'clients', element: <Clients /> },
      { path: 'clients/nouveau', element: <ClientsForm /> },
      { path: 'clients/:id', element: <ClientsForm /> },
      { path: 'agences', element: <Agences /> },
      { path: 'agences/nouveau', element: <AgencesForm /> },
      { path: 'agences/:id', element: <AgencesForm /> },
      { path: 'localisation', element: <Localisation /> },
      { path: 'localisation/provinces/nouveau', element: <ProvinceForm /> },
      { path: 'localisation/provinces/:id', element: <ProvinceForm /> },
      { path: 'localisation/villes/nouveau', element: <VilleForm /> },
      { path: 'localisation/villes/:id', element: <VilleForm /> },
      { path: 'localisation/communes/nouveau', element: <CommuneForm /> },
      { path: 'localisation/communes/:id', element: <CommuneForm /> },
      { path: 'tarifs', element: <Tarifs /> },
      { path: 'tarifs/nouveau', element: <TarifsForm /> },
      { path: 'tarifs/:id', element: <TarifsForm /> },
      { path: 'references', element: <References /> },
      { path: 'references/types/nouveau', element: <TypeColisForm /> },
      { path: 'references/types/:id', element: <TypeColisForm /> },
      { path: 'references/services/nouveau', element: <ServiceTransportForm /> },
      { path: 'references/services/:id', element: <ServiceTransportForm /> },
      { path: 'references/devises/nouveau', element: <DeviseForm /> },
      { path: 'references/devises/:code', element: <DeviseForm /> },
      { path: 'references/modes/nouveau', element: <ModePaiementForm /> },
      { path: 'references/modes/:id', element: <ModePaiementForm /> },
      { path: 'expeditions', element: <Expeditions /> },
      { path: 'expeditions/nouveau', element: <ExpeditionsForm /> },
      { path: 'expeditions/:id/modifier', element: <ExpeditionsForm /> },
      { path: 'expeditions/:id', element: <ExpeditionsDetail /> },
      { path: 'transferts', element: <Transferts /> },
      { path: 'transferts/nouveau', element: <TransfertsForm /> },
      { path: 'transferts/:id', element: <TransfertsForm /> },
      { path: 'paiements', element: <Paiements /> },
      { path: 'paiements/nouveau', element: <PaiementsForm /> },
      { path: 'paiements/:id', element: <PaiementsForm /> },
      { path: 'factures', element: <Factures /> },
      { path: 'factures/nouveau', element: <FacturesForm /> },
      { path: 'factures/:id', element: <FacturesForm /> },
      { path: 'remboursements', element: <Remboursements /> },
      { path: 'remboursements/nouveau', element: <RemboursementsForm /> },
      { path: 'remboursements/:id', element: <RemboursementsForm /> },
      { path: 'caisses', element: <Caisses /> },
      { path: 'caisses/nouveau', element: <CaissesForm /> },
      { path: 'caisses/:id', element: <CaissesForm /> },
      { path: 'retraits', element: <Retraits /> },
      { path: 'retraits/nouveau', element: <RetraitsForm /> },
      { path: 'livraisons', element: <Livraisons /> },
      { path: 'livraisons/nouveau', element: <LivraisonsForm /> },
      { path: 'livraisons/:id', element: <LivraisonsForm /> },
      { path: 'utilisateurs', element: <Utilisateurs /> },
      { path: 'utilisateurs/nouveau', element: <UtilisateursForm /> },
      { path: 'utilisateurs/:id', element: <UtilisateursForm /> },
      { path: 'roles', element: <Roles /> },
      { path: 'roles/nouveau', element: <RolesForm /> },
      { path: 'roles/:id/permissions', element: <RolePermissionsForm /> },
      { path: 'roles/:id', element: <RolesForm /> },
      { path: 'otp', element: <Otp /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'audit', element: <Audit /> },
      { path: 'rapports', element: <Rapports /> },
      { path: 'parametres', element: <Parametres /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  const loadMe = useAuth((s) => s.loadMe)

  useEffect(() => {
    loadMe()
  }, [loadMe])

  return <RouterProvider router={router} />
}
