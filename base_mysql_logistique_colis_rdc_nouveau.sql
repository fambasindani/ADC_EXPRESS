-- ============================================================
-- BASE DE DONNEES : logistique_colis_rdc
-- Systeme de gestion de courrier, colis, transport et livraison
-- Conception : MySQL 8.0+ / InnoDB / utf8mb4
-- Pays cible : Republique Democratique du Congo
-- Version : 2.0 (corrigee et optimisee)
--
-- Notes de conception :
-- 1. Les montants sont stockes en DECIMAL, jamais en FLOAT.
-- 2. Les devises CDF et USD sont prevues.
-- 3. Un colis peut etre paye au depot ou au retrait.
-- 4. Un colis peut etre suivi publiquement par son numero de suivi.
-- 5. Les mouvements et paiements sont historises.
-- 6. Les mots de passe doivent etre stockes sous forme de hash
--    genere par le backend (bcrypt/Argon2), jamais en clair.
-- 7. Les numeros (suivi, facture, paiement) sont generes via la
--    table `sequences` de maniere atomique cote backend.
-- ============================================================

CREATE DATABASE IF NOT EXISTS logistique_colis_rdc
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE logistique_colis_rdc;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. ORGANISATION ET LOCALISATION
-- ------------------------------------------------------------

CREATE TABLE provinces (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    nom VARCHAR(120) NOT NULL UNIQUE,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE villes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    province_id BIGINT UNSIGNED NOT NULL,
    nom VARCHAR(120) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ville_province (province_id, nom),
    INDEX idx_ville_province (province_id),
    INDEX idx_ville_actif (actif),
    CONSTRAINT fk_villes_province FOREIGN KEY (province_id)
        REFERENCES provinces(id)
) ENGINE=InnoDB;

CREATE TABLE communes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ville_id BIGINT UNSIGNED NOT NULL,
    nom VARCHAR(120) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_commune_ville (ville_id, nom),
    INDEX idx_commune_ville (ville_id),
    CONSTRAINT fk_communes_ville FOREIGN KEY (ville_id)
        REFERENCES villes(id)
) ENGINE=InnoDB;

CREATE TABLE agences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    nom VARCHAR(150) NOT NULL,
    province_id BIGINT UNSIGNED NOT NULL,
    ville_id BIGINT UNSIGNED NOT NULL,
    commune_id BIGINT UNSIGNED NULL,
    adresse VARCHAR(255) NOT NULL,
    telephone VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    type_agence ENUM('SIEGE','PRINCIPALE','SECONDAIRE','POINT_RELAIS') NOT NULL DEFAULT 'SECONDAIRE',
    agence_parent_id BIGINT UNSIGNED NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_agence_ville (ville_id),
    INDEX idx_agence_province (province_id),
    INDEX idx_agence_actif (actif),
    INDEX idx_agence_type (type_agence),
    CONSTRAINT fk_agence_province FOREIGN KEY (province_id) REFERENCES provinces(id),
    CONSTRAINT fk_agence_ville FOREIGN KEY (ville_id) REFERENCES villes(id),
    CONSTRAINT fk_agence_commune FOREIGN KEY (commune_id) REFERENCES communes(id),
    CONSTRAINT fk_agence_parent FOREIGN KEY (agence_parent_id) REFERENCES agences(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. UTILISATEURS, ROLES ET PERMISSIONS (RBAC)
-- ------------------------------------------------------------

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agence_id BIGINT UNSIGNED NULL,
    nom VARCHAR(100) NOT NULL,
    postnom VARCHAR(100) NULL,
    prenom VARCHAR(100) NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telephone VARCHAR(30) NULL,
    password_hash VARCHAR(255) NOT NULL,
    statut ENUM('ACTIF','INACTIF','BLOQUE') NOT NULL DEFAULT 'ACTIF',
    derniere_connexion DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_agence (agence_id),
    INDEX idx_user_statut (statut),
    INDEX idx_user_telephone (telephone),
    CONSTRAINT fk_users_agence FOREIGN KEY (agence_id) REFERENCES agences(id)
) ENGINE=InnoDB;

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(80) NOT NULL,
    nom VARCHAR(150) NOT NULL,
    description VARCHAR(255) NULL,
    INDEX idx_permission_module (module)
) ENGINE=InnoDB;

-- CORRECTION : ajout d'une PK auto-increment + UNIQUE pour eviter
-- les problemes de NULL dans une PK composite.
CREATE TABLE user_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    agence_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_role_agence (user_id, role_id, agence_id),
    INDEX idx_user_roles_user (user_id),
    INDEX idx_user_roles_role (role_id),
    INDEX idx_user_roles_agence (agence_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_user_roles_agence FOREIGN KEY (agence_id) REFERENCES agences(id)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    INDEX idx_role_perm_permission (permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. CLIENTS, EXPEDITEURS ET DESTINATAIRES
-- ------------------------------------------------------------

CREATE TABLE clients (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code_client VARCHAR(30) NOT NULL UNIQUE,
    type_client ENUM('PERSONNE_PHYSIQUE','ENTREPRISE') NOT NULL DEFAULT 'PERSONNE_PHYSIQUE',
    nom_ou_raison_sociale VARCHAR(180) NOT NULL,
    postnom VARCHAR(100) NULL,
    prenom VARCHAR(100) NULL,
    telephone VARCHAR(30) NOT NULL,
    telephone_secondaire VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    adresse VARCHAR(255) NULL,
    ville_id BIGINT UNSIGNED NULL,
    piece_identite_type VARCHAR(60) NULL,
    piece_identite_numero VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_telephone (telephone),
    INDEX idx_client_nom (nom_ou_raison_sociale),
    INDEX idx_client_email (email),
    INDEX idx_client_ville (ville_id),
    CONSTRAINT fk_clients_ville FOREIGN KEY (ville_id) REFERENCES villes(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. CATALOGUE, TARIFICATION ET DEVISES
-- ------------------------------------------------------------

CREATE TABLE devises (
    code CHAR(3) PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    symbole VARCHAR(10) NOT NULL,
    decimales TINYINT UNSIGNED NOT NULL DEFAULT 2,
    actif BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE types_colis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    fragile BOOLEAN NOT NULL DEFAULT FALSE,
    actif BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE services_transport (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    delai_indicatif_jours SMALLINT UNSIGNED NULL,
    description VARCHAR(255) NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE tarifs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agence_origine_id BIGINT UNSIGNED NULL,
    agence_destination_id BIGINT UNSIGNED NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    devise_code CHAR(3) NOT NULL,
    prix_base DECIMAL(15,2) NOT NULL DEFAULT 0,
    prix_kg DECIMAL(15,2) NOT NULL DEFAULT 0,
    frais_supplementaires DECIMAL(15,2) NOT NULL DEFAULT 0,
    poids_min DECIMAL(10,3) NOT NULL DEFAULT 0,
    poids_max DECIMAL(10,3) NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tarif_route (agence_origine_id, agence_destination_id, service_id),
    INDEX idx_tarif_actif_dates (actif, date_debut, date_fin),
    UNIQUE KEY uq_tarif_route (
        agence_origine_id, agence_destination_id,
        service_id, devise_code, date_debut
    ),
    CONSTRAINT fk_tarif_origine FOREIGN KEY (agence_origine_id) REFERENCES agences(id),
    CONSTRAINT fk_tarif_destination FOREIGN KEY (agence_destination_id) REFERENCES agences(id),
    CONSTRAINT fk_tarif_service FOREIGN KEY (service_id) REFERENCES services_transport(id),
    CONSTRAINT fk_tarif_devise FOREIGN KEY (devise_code) REFERENCES devises(code),
    CONSTRAINT chk_tarif_prix CHECK (prix_base >= 0 AND prix_kg >= 0 AND frais_supplementaires >= 0),
    CONSTRAINT chk_tarif_poids CHECK (poids_min >= 0 AND (poids_max IS NULL OR poids_max > poids_min))
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. COLIS ET EXPEDITION
-- ------------------------------------------------------------

CREATE TABLE colis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_suivi VARCHAR(40) NOT NULL UNIQUE,
    client_expediteur_id BIGINT UNSIGNED NOT NULL,
    nom_expediteur VARCHAR(180) NOT NULL,
    telephone_expediteur VARCHAR(30) NOT NULL,
    adresse_expediteur VARCHAR(255) NULL,
    nom_destinataire VARCHAR(180) NOT NULL,
    telephone_destinataire VARCHAR(30) NOT NULL,
    email_destinataire VARCHAR(150) NULL,
    adresse_destinataire VARCHAR(255) NULL,
    ville_destination_id BIGINT UNSIGNED NULL,
    agence_depot_id BIGINT UNSIGNED NOT NULL,
    agence_destination_id BIGINT UNSIGNED NOT NULL,
    type_colis_id BIGINT UNSIGNED NOT NULL,
    service_id BIGINT UNSIGNED NOT NULL,
    description_contenu TEXT NULL,
    poids_kg DECIMAL(10,3) NOT NULL,
    longueur_cm DECIMAL(10,2) NULL,
    largeur_cm DECIMAL(10,2) NULL,
    hauteur_cm DECIMAL(10,2) NULL,
    valeur_declaree DECIMAL(15,2) NULL,
    devise_valeur CHAR(3) NULL,
    montant_transport DECIMAL(15,2) NOT NULL,
    devise_paiement CHAR(3) NOT NULL,
    mode_facturation ENUM('PAYE_AU_DEPOT','PAYE_AU_RETRAIT') NOT NULL,
    statut ENUM(
        'ENREGISTRE','EN_ATTENTE_PAIEMENT','PRET_EXPEDITION',
        'EN_TRANSIT','ARRIVE_AGENCE','EN_LIVRAISON',
        'LIVRE','RETIRE','ANNULE','PERDU','ENDOMMAGE','RETOUR'
    ) NOT NULL DEFAULT 'ENREGISTRE',
    date_depot DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_estimee_arrivee DATE NULL,
    date_arrivee DATETIME NULL,
    date_cloture DATETIME NULL,
    observations TEXT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Index existants conserves
    INDEX idx_colis_statut (statut),
    INDEX idx_colis_dates (date_depot, date_estimee_arrivee),
    INDEX idx_colis_destinataire (telephone_destinataire),
    INDEX idx_colis_agences (agence_depot_id, agence_destination_id),

    -- Index additionnels critiques
    INDEX idx_colis_tel_expediteur (telephone_expediteur),
    INDEX idx_colis_client (client_expediteur_id),
    INDEX idx_colis_depot_statut (agence_depot_id, statut),
    INDEX idx_colis_dest_statut (agence_destination_id, statut),
    INDEX idx_colis_statut_datedepot (statut, date_depot),
    INDEX idx_colis_ville_dest (ville_destination_id),

    CONSTRAINT fk_colis_expediteur FOREIGN KEY (client_expediteur_id) REFERENCES clients(id),
    CONSTRAINT fk_colis_ville_destination FOREIGN KEY (ville_destination_id) REFERENCES villes(id),
    CONSTRAINT fk_colis_agence_depot FOREIGN KEY (agence_depot_id) REFERENCES agences(id),
    CONSTRAINT fk_colis_agence_destination FOREIGN KEY (agence_destination_id) REFERENCES agences(id),
    CONSTRAINT fk_colis_type FOREIGN KEY (type_colis_id) REFERENCES types_colis(id),
    CONSTRAINT fk_colis_service FOREIGN KEY (service_id) REFERENCES services_transport(id),
    CONSTRAINT fk_colis_devise_valeur FOREIGN KEY (devise_valeur) REFERENCES devises(code),
    CONSTRAINT fk_colis_devise_paiement FOREIGN KEY (devise_paiement) REFERENCES devises(code),
    CONSTRAINT fk_colis_created_by FOREIGN KEY (created_by) REFERENCES users(id),

    CONSTRAINT chk_colis_poids CHECK (poids_kg > 0),
    CONSTRAINT chk_colis_montant CHECK (montant_transport >= 0),
    CONSTRAINT chk_colis_valeur CHECK (valeur_declaree IS NULL OR valeur_declaree >= 0),
    CONSTRAINT chk_colis_numero CHECK (
        numero_suivi REGEXP '^[A-Z0-9-]{8,40}$'
    )
) ENGINE=InnoDB;

CREATE TABLE expeditions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(40) NOT NULL UNIQUE,
    agence_depart_id BIGINT UNSIGNED NOT NULL,
    agence_arrivee_id BIGINT UNSIGNED NOT NULL,
    mode_transport ENUM('ROUTE','AERIEN','FERROVIAIRE','FLUVIAL','AUTRE') NOT NULL DEFAULT 'ROUTE',
    transporteur VARCHAR(150) NULL,
    numero_moyen_transport VARCHAR(80) NULL,
    chauffeur_nom VARCHAR(150) NULL,
    chauffeur_telephone VARCHAR(30) NULL,
    date_depart DATETIME NULL,
    date_arrivee_prevue DATETIME NULL,
    date_arrivee_reelle DATETIME NULL,
    statut ENUM('PLANIFIEE','EN_COURS','ARRIVEE','ANNULEE') NOT NULL DEFAULT 'PLANIFIEE',
    cree_par BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expedition_statut (statut),
    INDEX idx_expedition_agences_date (agence_depart_id, agence_arrivee_id, date_depart),
    INDEX idx_expedition_dates (date_depart, date_arrivee_prevue),
    CONSTRAINT fk_expedition_depart FOREIGN KEY (agence_depart_id) REFERENCES agences(id),
    CONSTRAINT fk_expedition_arrivee FOREIGN KEY (agence_arrivee_id) REFERENCES agences(id),
    CONSTRAINT fk_expedition_user FOREIGN KEY (cree_par) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE expedition_colis (
    expedition_id BIGINT UNSIGNED NOT NULL,
    colis_id BIGINT UNSIGNED NOT NULL,
    date_chargement DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_dechargement DATETIME NULL,
    PRIMARY KEY (expedition_id, colis_id),
    INDEX idx_expcolis_colis (colis_id),
    CONSTRAINT fk_exp_colis_expedition FOREIGN KEY (expedition_id) REFERENCES expeditions(id),
    CONSTRAINT fk_exp_colis_colis FOREIGN KEY (colis_id) REFERENCES colis(id)
) ENGINE=InnoDB;

CREATE TABLE transferts_colis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    colis_id BIGINT UNSIGNED NOT NULL,
    agence_depart_id BIGINT UNSIGNED NOT NULL,
    agence_arrivee_id BIGINT UNSIGNED NOT NULL,
    expedition_id BIGINT UNSIGNED NULL,
    date_transfert DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_reception DATETIME NULL,
    remis_par BIGINT UNSIGNED NOT NULL,
    recu_par BIGINT UNSIGNED NULL,
    statut ENUM('EN_ATTENTE','EXPEDIE','RECU','ANNULE') NOT NULL DEFAULT 'EN_ATTENTE',
    observations TEXT NULL,
    INDEX idx_transfert_colis (colis_id),
    INDEX idx_transfert_statut (statut),
    INDEX idx_transfert_dates (date_transfert, date_reception),
    INDEX idx_transfert_agences (agence_depart_id, agence_arrivee_id),
    INDEX idx_transfert_expedition (expedition_id),
    CONSTRAINT fk_transfert_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_transfert_depart FOREIGN KEY (agence_depart_id) REFERENCES agences(id),
    CONSTRAINT fk_transfert_arrivee FOREIGN KEY (agence_arrivee_id) REFERENCES agences(id),
    CONSTRAINT fk_transfert_expedition FOREIGN KEY (expedition_id) REFERENCES expeditions(id),
    CONSTRAINT fk_transfert_remis FOREIGN KEY (remis_par) REFERENCES users(id),
    CONSTRAINT fk_transfert_recu FOREIGN KEY (recu_par) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. SUIVI ET HISTORIQUE DES COLIS
-- ------------------------------------------------------------

CREATE TABLE historique_colis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    colis_id BIGINT UNSIGNED NOT NULL,
    agence_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    ancien_statut VARCHAR(40) NULL,
    nouveau_statut VARCHAR(40) NOT NULL,
    commentaire VARCHAR(500) NULL,
    date_evenement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_historique_colis_date (colis_id, date_evenement),
    INDEX idx_historique_statut (nouveau_statut),
    INDEX idx_historique_agence_date (agence_id, date_evenement),
    CONSTRAINT fk_historique_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_historique_agence FOREIGN KEY (agence_id) REFERENCES agences(id),
    CONSTRAINT fk_historique_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. FACTURATION ET PAIEMENTS
-- ------------------------------------------------------------

CREATE TABLE factures (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_facture VARCHAR(40) NOT NULL UNIQUE,
    colis_id BIGINT UNSIGNED NOT NULL,
    montant_total DECIMAL(15,2) NOT NULL,
    devise_code CHAR(3) NOT NULL,
    date_facture DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('BROUILLON','EN_ATTENTE','PARTIELLE','PAYEE','ANNULEE','REMBOURSEE') NOT NULL DEFAULT 'EN_ATTENTE',
    cree_par BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_facture_colis (colis_id),
    INDEX idx_facture_statut (statut),
    INDEX idx_facture_date (date_facture),
    INDEX idx_facture_devise (devise_code),
    CONSTRAINT fk_facture_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_facture_devise FOREIGN KEY (devise_code) REFERENCES devises(code),
    CONSTRAINT fk_facture_user FOREIGN KEY (cree_par) REFERENCES users(id),
    CONSTRAINT chk_facture_montant CHECK (montant_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE modes_paiement (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    categorie ENUM('ESPECES','MOBILE_MONEY','BANQUE','CARTE','AUTRE') NOT NULL,
    operateur VARCHAR(80) NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_mode_paiement_categorie (categorie),
    INDEX idx_mode_paiement_actif (actif)
) ENGINE=InnoDB;

CREATE TABLE caisses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    agence_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(30) NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    devise_code CHAR(3) NOT NULL,
    solde_initial DECIMAL(15,2) NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_caisse_agence_code (agence_id, code),
    INDEX idx_caisse_devise (devise_code),
    INDEX idx_caisse_actif (actif),
    CONSTRAINT fk_caisse_agence FOREIGN KEY (agence_id) REFERENCES agences(id),
    CONSTRAINT fk_caisse_devise FOREIGN KEY (devise_code) REFERENCES devises(code),
    CONSTRAINT chk_caisse_solde CHECK (solde_initial >= 0)
) ENGINE=InnoDB;

CREATE TABLE paiements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_paiement VARCHAR(50) NOT NULL UNIQUE,
    facture_id BIGINT UNSIGNED NOT NULL,
    colis_id BIGINT UNSIGNED NOT NULL,
    agence_id BIGINT UNSIGNED NOT NULL,
    caisse_id BIGINT UNSIGNED NULL,
    mode_paiement_id BIGINT UNSIGNED NOT NULL,
    encaisse_par BIGINT UNSIGNED NOT NULL,
    payeur_nom VARCHAR(180) NULL,
    payeur_telephone VARCHAR(30) NULL,
    montant DECIMAL(15,2) NOT NULL,
    devise_code CHAR(3) NOT NULL,
    reference_externe VARCHAR(120) NULL,
    moment_paiement ENUM('DEPOT','RETRAIT','AUTRE') NOT NULL,
    statut ENUM('EN_ATTENTE','VALIDE','REJETE','ANNULE','REMBOURSE') NOT NULL DEFAULT 'VALIDE',
    date_paiement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observations VARCHAR(500) NULL,

    INDEX idx_paiement_colis (colis_id, date_paiement),
    INDEX idx_paiement_agence_date (agence_id, date_paiement),
    INDEX idx_paiement_statut (statut),
    INDEX idx_paiement_facture (facture_id),
    INDEX idx_paiement_mode (mode_paiement_id),
    INDEX idx_paiement_date (date_paiement),
    INDEX idx_paiement_agence_statut_date (agence_id, statut, date_paiement),
    INDEX idx_paiement_moment (moment_paiement),

    CONSTRAINT fk_paiement_facture FOREIGN KEY (facture_id) REFERENCES factures(id),
    CONSTRAINT fk_paiement_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_paiement_agence FOREIGN KEY (agence_id) REFERENCES agences(id),
    CONSTRAINT fk_paiement_caisse FOREIGN KEY (caisse_id) REFERENCES caisses(id),
    CONSTRAINT fk_paiement_mode FOREIGN KEY (mode_paiement_id) REFERENCES modes_paiement(id),
    CONSTRAINT fk_paiement_user FOREIGN KEY (encaisse_par) REFERENCES users(id),
    CONSTRAINT fk_paiement_devise FOREIGN KEY (devise_code) REFERENCES devises(code),
    CONSTRAINT chk_paiement_montant CHECK (montant > 0)
) ENGINE=InnoDB;

CREATE TABLE remboursements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    paiement_id BIGINT UNSIGNED NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    motif VARCHAR(255) NOT NULL,
    rembourse_par BIGINT UNSIGNED NOT NULL,
    date_remboursement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('DEMANDE','VALIDE','REJETE','EFFECTUE') NOT NULL DEFAULT 'DEMANDE',
    INDEX idx_remboursement_paiement (paiement_id),
    INDEX idx_remboursement_statut (statut),
    INDEX idx_remboursement_date (date_remboursement),
    CONSTRAINT fk_remboursement_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id),
    CONSTRAINT fk_remboursement_user FOREIGN KEY (rembourse_par) REFERENCES users(id),
    CONSTRAINT chk_remboursement_montant CHECK (montant > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. RETRAIT ET LIVRAISON
-- ------------------------------------------------------------

CREATE TABLE retraits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    colis_id BIGINT UNSIGNED NOT NULL,
    agence_id BIGINT UNSIGNED NOT NULL,
    retire_par_nom VARCHAR(180) NOT NULL,
    retire_par_telephone VARCHAR(30) NOT NULL,
    type_identite VARCHAR(60) NULL,
    numero_identite VARCHAR(100) NULL,
    lien_avec_destinataire VARCHAR(80) NULL,
    date_retrait DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    agent_id BIGINT UNSIGNED NOT NULL,
    signature_path VARCHAR(255) NULL,
    preuve_path VARCHAR(255) NULL,
    observations TEXT NULL,
    UNIQUE KEY uq_retrait_colis (colis_id),
    INDEX idx_retrait_agence_date (agence_id, date_retrait),
    INDEX idx_retrait_agent (agent_id),
    INDEX idx_retrait_date (date_retrait),
    CONSTRAINT fk_retrait_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_retrait_agence FOREIGN KEY (agence_id) REFERENCES agences(id),
    CONSTRAINT fk_retrait_agent FOREIGN KEY (agent_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE livraisons (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    colis_id BIGINT UNSIGNED NOT NULL,
    livreur_id BIGINT UNSIGNED NOT NULL,
    adresse_livraison VARCHAR(255) NOT NULL,
    date_affectation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_tentative DATETIME NULL,
    date_livraison DATETIME NULL,
    statut ENUM('A_AFFECTER','EN_COURS','LIVRE','ECHEC','REPROGRAMME') NOT NULL DEFAULT 'A_AFFECTER',
    motif_echec VARCHAR(255) NULL,
    frais_livraison DECIMAL(15,2) NOT NULL DEFAULT 0,
    devise_code CHAR(3) NOT NULL,
    INDEX idx_livraison_colis (colis_id),
    INDEX idx_livraison_statut (statut),
    INDEX idx_livraison_livreur_statut (livreur_id, statut),
    INDEX idx_livraison_date (date_affectation),
    CONSTRAINT fk_livraison_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_livraison_livreur FOREIGN KEY (livreur_id) REFERENCES users(id),
    CONSTRAINT fk_livraison_devise FOREIGN KEY (devise_code) REFERENCES devises(code),
    CONSTRAINT chk_livraison_frais CHECK (frais_livraison >= 0)
) ENGINE=InnoDB;

CREATE TABLE preuves_livraison (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    livraison_id BIGINT UNSIGNED NOT NULL,
    nom_receptionnaire VARCHAR(180) NOT NULL,
    telephone_receptionnaire VARCHAR(30) NULL,
    signature_path VARCHAR(255) NULL,
    photo_path VARCHAR(255) NULL,
    code_otp_verifie BOOLEAN NOT NULL DEFAULT FALSE,
    date_preuve DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_preuve_livraison (livraison_id),
    CONSTRAINT fk_preuve_livraison FOREIGN KEY (livraison_id) REFERENCES livraisons(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. OTP, NOTIFICATIONS, PIECES JOINTES ET AUDIT
-- ------------------------------------------------------------

-- NOUVELLE TABLE : codes OTP pour securiser retrait / livraison
CREATE TABLE otp_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    colis_id BIGINT UNSIGNED NOT NULL,
    telephone VARCHAR(30) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    usage_otp ENUM('RETRAIT','LIVRAISON','SUIVI') NOT NULL,
    expire_at DATETIME NOT NULL,
    utilise BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_colis_usage (colis_id, usage_otp),
    INDEX idx_otp_expire (expire_at),
    CONSTRAINT fk_otp_colis FOREIGN KEY (colis_id) REFERENCES colis(id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    colis_id BIGINT UNSIGNED NULL,
    canal ENUM('APPLICATION','SMS','EMAIL','WHATSAPP') NOT NULL DEFAULT 'APPLICATION',
    destinataire VARCHAR(180) NULL,
    sujet VARCHAR(180) NULL,
    message TEXT NOT NULL,
    statut ENUM('A_ENVOYER','ENVOYEE','ECHEC','LUE') NOT NULL DEFAULT 'A_ENVOYER',
    date_envoi DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_user (user_id, statut),
    INDEX idx_notification_statut (statut),
    INDEX idx_notification_canal (canal),
    INDEX idx_notification_colis (colis_id),
    INDEX idx_notification_date (created_at),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_notification_colis FOREIGN KEY (colis_id) REFERENCES colis(id)
) ENGINE=InnoDB;

CREATE TABLE pieces_jointes_colis (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    colis_id BIGINT UNSIGNED NOT NULL,
    type_piece VARCHAR(60) NOT NULL,
    nom_fichier VARCHAR(255) NOT NULL,
    chemin_fichier VARCHAR(500) NOT NULL,
    mime_type VARCHAR(120) NULL,
    taille_octets BIGINT UNSIGNED NULL,
    ajoute_par BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_piece_colis (colis_id),
    INDEX idx_piece_type (type_piece),
    CONSTRAINT fk_piece_colis FOREIGN KEY (colis_id) REFERENCES colis(id),
    CONSTRAINT fk_piece_user FOREIGN KEY (ajoute_par) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE journaux_activites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    agence_id BIGINT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    table_cible VARCHAR(100) NULL,
    id_cible BIGINT UNSIGNED NULL,
    adresse_ip VARCHAR(45) NULL,
    details JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user_date (user_id, created_at),
    INDEX idx_audit_cible (table_cible, id_cible),
    INDEX idx_audit_date (created_at),
    INDEX idx_audit_action (action),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_audit_agence FOREIGN KEY (agence_id) REFERENCES agences(id)
) ENGINE=InnoDB;

CREATE TABLE parametres (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cle VARCHAR(100) NOT NULL UNIQUE,
    valeur TEXT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. SEQUENCES (generation atomique des numeros)
-- ------------------------------------------------------------

-- NOUVELLE TABLE : pour generer numero_suivi, numero_facture,
-- reference_paiement de maniere atomique (SELECT ... FOR UPDATE).
CREATE TABLE sequences (
    nom VARCHAR(50) PRIMARY KEY,
    prefixe VARCHAR(20) NOT NULL,
    annee SMALLINT UNSIGNED NOT NULL,
    dernier_numero BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. TRIGGERS DE SECURITE METIER
-- ------------------------------------------------------------

DELIMITER //

-- Empeche le retrait d'un colis PAYE_AU_RETRAIT non integralement paye
CREATE TRIGGER trg_retrait_verif_paiement
BEFORE INSERT ON retraits
FOR EACH ROW
BEGIN
    DECLARE v_mode ENUM('PAYE_AU_DEPOT','PAYE_AU_RETRAIT');
    DECLARE v_montant DECIMAL(15,2);
    DECLARE v_paye DECIMAL(15,2);

    SELECT mode_facturation, montant_transport
      INTO v_mode, v_montant
      FROM colis WHERE id = NEW.colis_id;

    SELECT COALESCE(SUM(montant), 0)
      INTO v_paye
      FROM paiements
     WHERE colis_id = NEW.colis_id
       AND statut = 'VALIDE';

    IF v_mode = 'PAYE_AU_RETRAIT' AND v_paye < v_montant THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Retrait impossible : colis non integralement paye';
    END IF;
END;
//

-- Empeche la sortie d'un colis PAYE_AU_DEPOT non paye
CREATE TRIGGER trg_expedition_verif_paiement
BEFORE INSERT ON expedition_colis
FOR EACH ROW
BEGIN
    DECLARE v_mode ENUM('PAYE_AU_DEPOT','PAYE_AU_RETRAIT');
    DECLARE v_montant DECIMAL(15,2);
    DECLARE v_paye DECIMAL(15,2);

    SELECT mode_facturation, montant_transport
      INTO v_mode, v_montant
      FROM colis WHERE id = NEW.colis_id;

    SELECT COALESCE(SUM(montant), 0)
      INTO v_paye
      FROM paiements
     WHERE colis_id = NEW.colis_id
       AND statut = 'VALIDE';

    IF v_mode = 'PAYE_AU_DEPOT' AND v_paye < v_montant THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Expedition impossible : colis paye au depot non regle';
    END IF;
END;
//

-- Verifie la coherence des devises paiement / facture
CREATE TRIGGER trg_paiement_verif_devise
BEFORE INSERT ON paiements
FOR EACH ROW
BEGIN
    DECLARE v_devise_facture CHAR(3);

    SELECT devise_code INTO v_devise_facture
      FROM factures WHERE id = NEW.facture_id;

    IF v_devise_facture <> NEW.devise_code THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Devise du paiement differente de la devise de la facture';
    END IF;
END;
//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 12. DONNEES INITIALES
-- ------------------------------------------------------------

INSERT INTO devises (code, nom, symbole, decimales) VALUES
('CDF', 'Franc congolais', 'FC', 2),
('USD', 'Dollar americain', '$', 2);

INSERT INTO modes_paiement (code, libelle, categorie, operateur) VALUES
('ESPECES', 'Especes', 'ESPECES', NULL),
('MPESA', 'M-Pesa', 'MOBILE_MONEY', 'Vodacom'),
('AIRTEL_MONEY', 'Airtel Money', 'MOBILE_MONEY', 'Airtel'),
('ORANGE_MONEY', 'Orange Money', 'MOBILE_MONEY', 'Orange'),
('AFRICELL_MONEY', 'Africell Money', 'MOBILE_MONEY', 'Africell'),
('VIREMENT', 'Virement bancaire', 'BANQUE', NULL),
('CARTE', 'Carte bancaire', 'CARTE', NULL);

INSERT INTO types_colis (code, libelle, description, fragile) VALUES
('DOCUMENT', 'Documents', 'Courriers et documents', FALSE),
('PAQUET', 'Paquet', 'Colis ordinaire', FALSE),
('FRAGILE', 'Colis fragile', 'Colis necessitant une manipulation speciale', TRUE),
('ELECTRONIQUE', 'Equipement electronique', 'Appareils et accessoires electroniques', TRUE),
('AUTRE', 'Autre', 'Autre type de colis autorise', FALSE);

INSERT INTO services_transport (code, libelle, delai_indicatif_jours, description) VALUES
('STANDARD', 'Standard', 5, 'Acheminement standard'),
('EXPRESS', 'Express', 2, 'Acheminement prioritaire'),
('ECONOMIQUE', 'Economique', 10, 'Acheminement a tarif economique');

INSERT INTO roles (code, nom, description) VALUES
('SUPER_ADMIN', 'Super administrateur', 'Administration globale de la plateforme'),
('ADMIN', 'Administrateur', 'Administration operationnelle'),
('DIRECTEUR_AGENCE', 'Directeur d agence', 'Supervision de son agence'),
('AGENT_RECEPTION', 'Agent de reception', 'Enregistrement des colis'),
('AGENT_TRANSIT', 'Agent de transit', 'Expedition et reception inter-agences'),
('CAISSIER', 'Caissier', 'Encaissement et edition des recus'),
('LIVREUR', 'Livreur', 'Livraison des colis'),
('AGENT_RETRAIT', 'Agent de retrait', 'Verification et remise des colis'),
('COMPTABLE', 'Comptable', 'Consultation financiere et rapprochement'),
('CLIENT', 'Client', 'Consultation de ses expeditions');

INSERT INTO permissions (code, module, nom) VALUES
('dashboard.view', 'dashboard', 'Consulter le tableau de bord'),
('users.view', 'utilisateurs', 'Consulter les utilisateurs'),
('users.create', 'utilisateurs', 'Creer un utilisateur'),
('users.update', 'utilisateurs', 'Modifier un utilisateur'),
('users.delete', 'utilisateurs', 'Desactiver un utilisateur'),
('roles.manage', 'securite', 'Gerer les roles et permissions'),
('agences.view', 'agences', 'Consulter les agences'),
('agences.manage', 'agences', 'Gerer les agences'),
('clients.view', 'clients', 'Consulter les clients'),
('clients.manage', 'clients', 'Gerer les clients'),
('colis.view', 'colis', 'Consulter les colis'),
('colis.create', 'colis', 'Enregistrer un colis'),
('colis.update', 'colis', 'Modifier un colis'),
('colis.cancel', 'colis', 'Annuler un colis'),
('colis.track', 'suivi', 'Consulter le suivi des colis'),
('expeditions.manage', 'transport', 'Gerer les expeditions'),
('transfers.manage', 'transport', 'Gerer les transferts inter-agences'),
('payments.view', 'finance', 'Consulter les paiements'),
('payments.collect', 'finance', 'Encaisser un paiement'),
('payments.refund', 'finance', 'Gerer les remboursements'),
('reports.view', 'rapports', 'Consulter les rapports'),
('withdrawals.manage', 'retraits', 'Autoriser et enregistrer les retraits'),
('deliveries.manage', 'livraisons', 'Gerer les livraisons');

-- Attribution initiale de toutes les permissions au role SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN';

-- Parametres de base
INSERT INTO parametres (cle, valeur, description) VALUES
('pays', 'Republique Democratique du Congo', 'Pays d exploitation'),
('devise_defaut', 'CDF', 'Devise par defaut de l application'),
('paiement_depot_active', '1', 'Autoriser le paiement au depot'),
('paiement_retrait_active', '1', 'Autoriser le paiement au retrait'),
('suivi_public_actif', '1', 'Autoriser le suivi public par numero de suivi');

-- Sequences initiales
INSERT INTO sequences (nom, prefixe, annee) VALUES
('colis', 'RDC', YEAR(CURDATE())),
('facture', 'FAC', YEAR(CURDATE())),
('paiement', 'PAY', YEAR(CURDATE())),
('expedition', 'EXP', YEAR(CURDATE()));

-- ============================================================
-- FIN DU SCRIPT
--
-- IMPORTANT POUR LE BACKEND :
-- - A la creation d'un colis, creer sa facture dans une transaction.
-- - Si PAYE_AU_DEPOT : exiger le paiement avant le depart du colis.
-- - Si PAYE_AU_RETRAIT : conserver le solde et bloquer le retrait
--   tant que le montant exigible n'est pas integralement regle.
-- - Ne jamais se fier au seul statut transmis par le frontend.
-- - Calculer le solde : montant facture - paiements valides
--   + remboursements effectues.
-- - Verifier l'agence de l'utilisateur cote serveur.
-- - Le numero de suivi doit etre genere cote serveur et etre unique
--   via la table `sequences` (SELECT ... FOR UPDATE + UPDATE).
-- - Les changements de statut doivent aussi creer une ligne dans
--   historique_colis, dans la meme transaction SQL.
-- - Les contraintes metier (montants positifs, paiement plafonne,
--   devise identique, interdiction de retrait impaye) sont
--   controles dans le backend + par des triggers de securite.
-- ============================================================