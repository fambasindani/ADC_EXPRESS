<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Colis;

/**
 * Page publique de suivi d'un colis (cible du QR code de l'étiquette).
 *
 * N'affiche aucune donnée sensible : ni téléphone, ni adresse, ni montant.
 */
class SuiviPublicController extends Controller
{
    public function show(string $numero)
    {
        $colis = Colis::with([
            'agenceDepot:id,code,nom',
            'agenceDestination:id,code,nom,ville_id',
            'agenceDestination.ville:id,nom',
            'villeDestination:id,nom',
            'typeColis:id,libelle,fragile',
            'historique' => fn ($q) => $q->with('agence:id,code,nom'),
        ])->where('numero_suivi', $numero)->first();

        return response()->view('colis.suivi', [
            'colis'  => $colis,
            'numero' => $numero,
        ], $colis ? 200 : 404);
    }
}
