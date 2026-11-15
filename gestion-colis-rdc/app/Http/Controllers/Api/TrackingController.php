<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;

class TrackingController extends Controller
{
    /**
     * GET /api/suivi/{numero}
     * Suivi public d'un colis par son numéro de suivi (sans authentification).
     * N'expose aucune donnée sensible (adresses, téléphones, montants).
     */
    public function suivre($numero)
    {
        $colis = Colis::with([
            'agenceDepot:id,code,nom,ville_id',
            'agenceDestination:id,code,nom,ville_id',
            'historique' => fn ($q) => $q->with('agence:id,code,nom')
                ->orderByDesc('date_evenement')
                ->select('colis_id', 'agence_id', 'ancien_statut', 'nouveau_statut', 'commentaire', 'date_evenement'),
        ])->where('numero_suivi', $numero)->first();

        if (! $colis) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun colis trouvé pour ce numéro de suivi.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'numero_suivi'        => $colis->numero_suivi,
                'statut'              => $colis->statut,
                'date_depot'          => $colis->date_depot,
                'date_estimee_arrivee' => $colis->date_estimee_arrivee,
                'date_arrivee'        => $colis->date_arrivee,
                'date_cloture'        => $colis->date_cloture,
                'agence_depot'        => $colis->agenceDepot?->nom,
                'agence_destination'  => $colis->agenceDestination?->nom,
                'historique'          => $colis->historique->map(fn ($h) => [
                    'statut'      => $h->nouveau_statut,
                    'commentaire' => $h->commentaire,
                    'date'        => $h->date_evenement,
                    'agence'      => $h->agence?->nom,
                ])->values(),
            ],
        ]);
    }
}
