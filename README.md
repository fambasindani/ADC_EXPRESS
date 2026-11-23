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

## Étiquette colis & suivi public

Chaque colis dispose d'une **étiquette imprimable (PDF, 100 × 150 mm)** générée côté client avec `@react-pdf/renderer` (bouton « Étiquette » sur la fiche du colis). L'étiquette contient le numéro de suivi, le trajet, le destinataire, le poids, le type et la mention « fragile » le cas échéant, ainsi qu'un **QR code**.

Le QR encode l'URL publique `PUBLIC_APP_URL/suivi/{numero_suivi}` :

- **Scan avec un téléphone** → la page Blade `resources/views/colis/suivi.blade.php` affiche le détail du colis (statut, progression, agences, dates, historique), sans aucune donnée sensible (téléphone, adresse, montants).
- Le QR est produit côté serveur (`app/Support/QrCode.php`, via `bacon/bacon-qr-code` + GD) et renvoyé en base64 par `GET /api/colis/{id}/etiquette`.

### Accès depuis un téléphone

Le QR doit pointer vers une adresse joignable depuis le téléphone :

```env
# gestion-colis-rdc/.env
PUBLIC_APP_URL=http://192.168.1.20:8000
```

Sans cette variable, l'hôte de la requête courante est utilisé (suffisant sur la même machine). Pour écouter sur le réseau local :

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

## Messages WhatsApp

L'envoi de messages WhatsApp dispose de **deux modes** :

1. **Envoi automatique** (recommandé) via la **WhatsApp Business Cloud API** (Meta) : le message part tout seul, sans intervention manuelle.
   ```env
   # gestion-colis-rdc/.env — obtenus sur developers.facebook.com > WhatsApp
   WHATSAPP_TOKEN=
   WHATSAPP_PHONE_NUMBER_ID=
   ```
2. **Click-to-chat** (repli) : si les clés ci-dessus sont absentes, le bouton ouvre `wa.me/<destinataire>` avec le message pré-rempli (l'agent clique « Envoyer »).

- Numéro émetteur configurable via le paramètre `whatsapp_numero` (page **Paramètres Globaux**), valeur par défaut `+243898596501`.
- Boutons « WhatsApp » sur la **fiche du colis** (prévenir le destinataire avec le lien de suivi) et sur la page **Codes OTP** (le code est envoyé automatiquement à la génération).
- Les numéros locaux (ex. `089…`) sont convertis automatiquement en format international `243…`.
