export interface Agence {
  id: number
  code: string
  nom: string
  province_id?: number
  ville_id?: number
  commune_id?: number | null
  adresse: string
  telephone?: string | null
  email?: string | null
  type_agence: string
  agence_parent_id?: number | null
  actif: boolean
}

export interface Role {
  id: number
  code: string
  nom: string
  description?: string | null
  actif: boolean
  permissions?: Permission[]
}

export interface Permission {
  id: number
  code: string
  module: string
  nom: string
  description?: string | null
}

export interface User {
  id: number
  nom: string
  postnom?: string | null
  prenom?: string | null
  nom_complet?: string
  email: string
  telephone?: string | null
  statut: 'ACTIF' | 'INACTIF' | 'BLOQUE'
  derniere_connexion?: string | null
  agence?: { id: number; code: string; nom: string; type: string } | null
  roles?: { id: number; code: string; nom: string }[]
  permissions?: string[]
  agence_id?: number | null
}

export interface Client {
  id: number
  code_client: string
  type_client: string
  nom_ou_raison_sociale: string
  postnom?: string | null
  prenom?: string | null
  telephone: string
  telephone_secondaire?: string | null
  email?: string | null
  adresse?: string | null
  ville_id?: number | null
  piece_identite_type?: string | null
  piece_identite_numero?: string | null
  ville?: { id: number; nom: string } | null
}

export interface Province {
  id: number
  code: string
  nom: string
  actif: boolean
}

export interface Ville {
  id: number
  province_id: number
  nom: string
  actif: boolean
  province?: { id: number; code: string; nom: string } | null
}

export interface Commune {
  id: number
  ville_id: number
  nom: string
  actif: boolean
  ville?: { id: number; nom: string; province_id?: number; province?: { id: number; code: string; nom: string } | null } | null
}

export interface Devise {
  code: string
  nom: string
  symbole: string
  decimales: number
  actif: boolean
}

export interface TypeColis {
  id: number
  code: string
  libelle: string
  description?: string | null
  fragile: boolean
  actif: boolean
}

export interface ServiceTransport {
  id: number
  code: string
  libelle: string
  delai_indicatif_jours?: number | null
  description?: string | null
  actif: boolean
}

export interface ModePaiement {
  id: number
  code: string
  libelle: string
  categorie: string
  operateur?: string | null
  actif: boolean
}

export interface Colis {
  id: number
  numero_suivi: string
  client_expediteur_id: number
  nom_expediteur: string
  telephone_expediteur: string
  adresse_expediteur?: string | null
  nom_destinataire: string
  telephone_destinataire: string
  email_destinataire?: string | null
  adresse_destinataire?: string | null
  ville_destination_id?: number | null
  agence_depot_id: number
  agence_destination_id: number
  type_colis_id: number
  service_id: number
  description_contenu?: string | null
  poids_kg: number
  longueur_cm?: number | null
  largeur_cm?: number | null
  hauteur_cm?: number | null
  valeur_declaree?: number | null
  devise_valeur?: string | null
  montant_transport: number
  devise_paiement: string
  mode_facturation: string
  statut: string
  date_depot: string
  date_estimee_arrivee?: string | null
  date_arrivee?: string | null
  date_cloture?: string | null
  observations?: string | null
  created_by: number
  agence_depot?: { id: number; code: string; nom: string } | null
  agence_destination?: { id: number; code: string; nom: string } | null
  ville_destination?: { id: number; nom: string } | null
  type_colis?: { id: number; code: string; libelle: string; fragile?: boolean } | null
  service?: { id: number; code: string; libelle: string } | null
  createur?: { id: number; nom: string; prenom: string } | null
  montant_paye?: number
  solde?: number
  est_paye?: boolean
}

export interface PaginationMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from?: number
  to?: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: PaginationMeta
}
