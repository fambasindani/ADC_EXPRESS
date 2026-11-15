export const STATUTS_COLIS = [
  'ENREGISTRE',
  'EN_ATTENTE_PAIEMENT',
  'PRET_EXPEDITION',
  'EN_TRANSIT',
  'ARRIVE_AGENCE',
  'EN_LIVRAISON',
  'LIVRE',
  'RETIRE',
  'ANNULE',
  'PERDU',
  'ENDOMMAGE',
  'RETOUR',
] as const

export type StatutColis = (typeof STATUTS_COLIS)[number]

export const STATUT_COLIS_STYLE: Record<StatutColis, string> = {
  ENREGISTRE: 'bg-slate-100 text-slate-700',
  EN_ATTENTE_PAIEMENT: 'bg-amber-100 text-amber-700',
  PRET_EXPEDITION: 'bg-blue-100 text-blue-700',
  EN_TRANSIT: 'bg-cyan-100 text-cyan-700',
  ARRIVE_AGENCE: 'bg-indigo-100 text-indigo-700',
  EN_LIVRAISON: 'bg-violet-100 text-violet-700',
  LIVRE: 'bg-emerald-100 text-emerald-700',
  RETIRE: 'bg-emerald-100 text-emerald-700',
  ANNULE: 'bg-red-100 text-red-700',
  PERDU: 'bg-red-100 text-red-700',
  ENDOMMAGE: 'bg-orange-100 text-orange-700',
  RETOUR: 'bg-rose-100 text-rose-700',
}

export const MODES_FACTURATION = ['PAYE_AU_DEPOT', 'PAYE_AU_RETRAIT'] as const

export const MODE_FACTURATION_LABEL: Record<string, string> = {
  PAYE_AU_DEPOT: 'Payé au dépôt',
  PAYE_AU_RETRAIT: 'Payé au retrait',
}

export const STATUTS_PAIEMENT = ['EN_ATTENTE', 'VALIDE', 'REJETE', 'ANNULE', 'REMBOURSE'] as const
export const STATUT_PAIEMENT_STYLE: Record<string, string> = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  VALIDE: 'bg-emerald-100 text-emerald-700',
  REJETE: 'bg-red-100 text-red-700',
  ANNULE: 'bg-slate-100 text-slate-700',
  REMBOURSE: 'bg-cyan-100 text-cyan-700',
}

export const STATUTS_LIVRAISON = ['A_AFFECTER', 'EN_COURS', 'LIVRE', 'ECHEC', 'REPROGRAMME'] as const
export const STATUT_LIVRAISON_STYLE: Record<string, string> = {
  A_AFFECTER: 'bg-slate-100 text-slate-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  LIVRE: 'bg-emerald-100 text-emerald-700',
  ECHEC: 'bg-red-100 text-red-700',
  REPROGRAMME: 'bg-amber-100 text-amber-700',
}

export const STATUTS_EXPEDITION = ['PLANIFIEE', 'EN_COURS', 'ARRIVEE', 'ANNULEE'] as const
export const STATUT_EXPEDITION_STYLE: Record<string, string> = {
  PLANIFIEE: 'bg-slate-100 text-slate-700',
  EN_COURS: 'bg-blue-100 text-blue-700',
  ARRIVEE: 'bg-emerald-100 text-emerald-700',
  ANNULEE: 'bg-red-100 text-red-700',
}

export const STATUTS_TRANSFERT = ['EN_ATTENTE', 'EXPEDIE', 'RECU', 'ANNULE'] as const

export const MODES_TRANSPORT = ['ROUTE', 'AERIEN', 'FERROVIAIRE', 'FLUVIAL', 'AUTRE'] as const

export const TYPES_CLIENT = ['PERSONNE_PHYSIQUE', 'ENTREPRISE'] as const
export const TYPE_CLIENT_LABEL: Record<string, string> = {
  PERSONNE_PHYSIQUE: 'Personne physique',
  ENTREPRISE: 'Entreprise',
}

export const TYPES_AGENCE = ['SIEGE', 'PRINCIPALE', 'SECONDAIRE', 'POINT_RELAIS'] as const

export const STATUTS_USER = ['ACTIF', 'INACTIF', 'BLOQUE'] as const
export const STATUT_USER_STYLE: Record<string, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-700',
  INACTIF: 'bg-slate-100 text-slate-700',
  BLOQUE: 'bg-red-100 text-red-700',
}

export const CATEGORIES_MODE_PAIEMENT = ['ESPECES', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'AUTRE'] as const

export const PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'roles.manage',
  'agences.view',
  'agences.manage',
  'clients.view',
  'clients.manage',
  'colis.view',
  'colis.create',
  'colis.update',
  'colis.cancel',
  'colis.track',
  'expeditions.manage',
  'transfers.manage',
  'payments.view',
  'payments.collect',
  'payments.refund',
  'reports.view',
  'withdrawals.manage',
  'deliveries.manage',
] as const

export const MOMENTS_PAIEMENT = ['DEPOT', 'RETRAIT', 'AUTRE'] as const
