# ADC EXPRESS

Application de gestion logistique et de colis pour la RDC.

## Contenu du dépôt

| Dossier | Description |
|---|---|
| `gestion-colis-rdc/` | API backend **Laravel** (PHP) : colis, expéditions, transferts, retraits, livraisons, paiements, factures, agences, utilisateurs, rôles, audit, états PDF. |
| `frontend/` | Interface **React + TypeScript + Vite + Tailwind** (tableau de bord, formulaires, listes paginées avec recherche). |

Fichiers à la racine : maquette `index.html` / `contenu.html`, `logo.png` et dump SQL de la base (`base_mysql_logistique_colis_rdc_nouveau.sql`).

## Prérequis

- PHP 8.2+ et Composer
- MySQL / MariaDB
- Node.js 18+ et npm

## Installation

### Backend (Laravel)

```bash
cd gestion-colis-rdc
composer install
cp .env.example .env
php artisan key:generate
# Configurer la connexion MySQL dans .env, puis :
php artisan migrate --seed
php artisan serve
```

API disponible sur `http://localhost:8000`.

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Interface disponible sur `http://localhost:5174`.

## Fonctionnalités principales

- Suivi des colis avec historique et changement de statut contrôlé.
- Expéditions inter-agences, transferts, retraits au guichet et livraisons à domicile.
- Paiements, factures, caisses et remboursements.
- Sécurité : rôles/permissions, codes OTP, journal d'audit.
- États et rapports PDF (bordereaux, reçus, factures).
- Listes paginées côté serveur avec recherche sur tous les écrans.

## Sécurité des sessions

La session est fermée automatiquement après une période d'inactivité :

- **Frontend** : délai défini par `IDLE_TIMEOUT_MINUTES` (30 minutes par défaut), surchargeable avec `VITE_IDLE_TIMEOUT_MINUTES`. L'utilisateur est déconnecté et renvoyé vers la page de connexion avec un message explicite.
- **API** : même contrôle côté serveur via `SESSION_IDLE_MINUTES` (30 minutes par défaut). Passé ce délai, le jeton Sanctum est supprimé et l'API répond `401`.

Les deux valeurs doivent rester alignées (`0` désactive le contrôle côté API).
