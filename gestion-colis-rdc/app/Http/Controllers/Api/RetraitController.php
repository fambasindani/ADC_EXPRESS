<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\HistoriqueColis;
use App\Models\JournalActivite;
use App\Models\Notification;
use App\Models\OtpCode;
use App\Models\Retrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RetraitController extends Controller
{
    /** GET /api/retraits */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Retrait::with([
            'colis:id,numero_suivi,nom_expediteur,nom_destinataire,mode_facturation,montant_transport,devise_paiement',
            'agence:id,code,nom',
            'agent:id,nom,prenom',
        ]);

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_id', $user->agence_id);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('retire_par_nom', 'like', "%{$s}%")
                  ->orWhere('retire_par_telephone', 'like', "%{$s}%")
                  ->orWhereHas('colis', fn($c) => $c->where('numero_suivi', 'like', "%{$s}%"));
            });
        }

        if ($request->filled('agence_id'))  $query->where('agence_id', $request->agence_id);
        if ($request->filled('date_start')) $query->whereDate('date_retrait', '>=', $request->date_start);
        if ($request->filled('date_end'))   $query->whereDate('date_retrait', '<=', $request->date_end);

        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $items   = $query->orderByDesc('date_retrait')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $items->items(),
            'meta'    => [
                'current_page' => $items->currentPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'last_page'    => $items->lastPage(),
                'from'         => $items->firstItem(),
                'to'           => $items->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/retraits
     * Enregistre un retrait. BLOQUE si colis PAYE_AU_RETRAIT et non payé.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'              => 'required|exists:colis,id',
            'retire_par_nom'        => 'required|string|max:180',
            'retire_par_telephone'  => 'required|string|max:30',
            'type_identite'         => 'nullable|string|max:60',
            'numero_identite'       => 'nullable|string|max:100',
            'lien_avec_destinataire' => 'nullable|string|max:80',
            'signature_path'        => 'nullable|string|max:255',
            'preuve_path'           => 'nullable|string|max:255',
            'otp_code'              => 'nullable|string|size:6',
            'observations'          => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $retrait = DB::transaction(function () use ($request) {
                $user  = $request->user();
                $colis = Colis::lockForUpdate()->findOrFail($request->colis_id);

                // 🔒 Le colis doit être dans un statut autorisé
                if (! in_array($colis->statut, ['ARRIVE_AGENCE', 'EN_LIVRAISON'])) {
                    throw new \Exception("Le colis doit être en statut ARRIVE_AGENCE pour être retiré. Statut actuel : {$colis->statut}.");
                }

                // 🔒 Vérifier qu'il n'a pas déjà été retiré
                if ($colis->retrait()->exists()) {
                    throw new \Exception('Ce colis a déjà été retiré.');
                }

                // 🔒 BLOQUER si PAYE_AU_RETRAIT et impayé
                if ($colis->mode_facturation === 'PAYE_AU_RETRAIT' && ! $colis->estPaye()) {
                    throw new \Exception(
                        "Retrait impossible : colis PAYE_AU_RETRAIT non soldé. Solde restant : {$colis->solde} {$colis->devise_paiement}."
                    );
                }

                // 🔒 Vérification OTP si fourni (sécurise la remise)
                if ($request->filled('otp_code') && ! OtpCode::verifier($colis->id, 'RETRAIT', $request->otp_code)) {
                    throw new \Exception('Code OTP invalide ou expiré. Retrait impossible.');
                }

                // 🔒 Le retrait se fait à l'agence de DESTINATION du colis.
                $agenceRetrait = $colis->agence_destination_id ?? $user->agence_id;

                // Un agent non administrateur ne peut retirer que les colis
                // destinés à sa propre agence.
                if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
                    if ((int) $agenceRetrait !== (int) $user->agence_id) {
                        throw new \Exception(
                            "Ce colis doit être retiré à son agence de destination ({$colis->agenceDestination?->nom})."
                        );
                    }
                }

                $retrait = Retrait::create([
                    'colis_id'              => $colis->id,
                    'agence_id'             => $agenceRetrait,
                    'retire_par_nom'        => $request->retire_par_nom,
                    'retire_par_telephone'  => $request->retire_par_telephone,
                    'type_identite'         => $request->type_identite,
                    'numero_identite'       => $request->numero_identite,
                    'lien_avec_destinataire' => $request->lien_avec_destinataire,
                    'date_retrait'          => now(),
                    'agent_id'              => $user->id,
                    'signature_path'        => $request->signature_path,
                    'preuve_path'           => $request->preuve_path,
                    'observations'          => $request->observations,
                ]);

                // Mise à jour du colis → RETIRE
                $ancienStatut = $colis->statut;
                $colis->update([
                    'statut'       => 'RETIRE',
                    'date_cloture' => now(),
                ]);
                $colis->synchroniserLivraisons();

                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $retrait->agence_id,
                    'user_id'        => $user->id,
                    'ancien_statut'  => $ancienStatut,
                    'nouveau_statut' => 'RETIRE',
                    'commentaire'    => "Retiré par {$request->retire_par_nom} ({$request->retire_par_telephone})",
                ]);

                Notification::creer(
                    null,
                    $colis->id,
                    'APPLICATION',
                    "Le colis {$colis->numero_suivi} a été retiré par {$request->retire_par_nom}.",
                    'Colis retiré'
                );

                JournalActivite::enregistrer(
                    'retrait.store',
                    'retraits',
                    $retrait->id,
                    ['colis_id' => $colis->id],
                    $user
                );

                return $retrait;
            });

            return response()->json([
                'success' => true,
                'message' => 'Retrait enregistré. Colis remis.',
                'data'    => $retrait->load('colis', 'agence', 'agent'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /** GET /api/retraits/{id} */
    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data'    => Retrait::with([
                'colis.agenceDepot', 'colis.agenceDestination', 'colis.typeColis',
                'colis.paiements', 'agence', 'agent:id,nom,prenom',
            ])->findOrFail($id),
        ]);
    }

    /** GET /api/retraits/par-colis/{colisId} */
    public function parColis($colisId)
    {
        $colis = Colis::findOrFail($colisId);
        $retrait = $colis->retrait()->with(['agence', 'agent:id,nom,prenom'])->first();

        return response()->json([
            'success' => true,
            'data'    => $retrait,
        ]);
    }

    /** GET /api/retraits/form-data */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'types_identite' => [
                    'CARTE_IDENTITE', 'PASSEPORT', 'PERMIS_CONDUIRE',
                    'CARTE_ELECTEUR', 'RCCM', 'AUTRE',
                ],
                'liens_destinataire' => [
                    'DESTINATAIRE_LUI_MEME', 'FAMILLE', 'AMI', 'COLLEGUE',
                    'MANDATAIRE', 'TRANSPORTEUR', 'AUTRE',
                ],
            ],
        ]);
    }

    /** GET /api/retraits/eligibles */
    public function eligibles(Request $request)
    {
        $user = $request->user();
        $query = Colis::with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->where('statut', 'ARRIVE_AGENCE')
            ->whereDoesntHave('retrait');

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_destination_id', $user->agence_id);
        }

        $colis = $query->orderBy('date_arrivee')->get();

        $colis->each(function (Colis $c) {
            $c->append(['montant_paye', 'solde']);
            $c->setAttribute('est_paye', $c->estPaye());
            $c->setAttribute('reglement_requis', $c->mode_facturation === 'PAYE_AU_RETRAIT' && ! $c->estPaye());
        });

        return response()->json([
            'success' => true,
            'data'    => $colis,
        ]);
    }

    /** GET /api/retraits/stats */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = Retrait::query();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_id', $user->agence_id);
        }

        if ($request->filled('date_start')) $query->whereDate('date_retrait', '>=', $request->date_start);
        if ($request->filled('date_end'))   $query->whereDate('date_retrait', '<=', $request->date_end);

        return response()->json([
            'success' => true,
            'data'    => [
                'total'        => $query->count(),
                'aujourd_hui'  => (clone $query)->whereDate('date_retrait', now()->toDateString())->count(),
                'ce_mois'      => (clone $query)->whereMonth('date_retrait', now()->month)->count(),
            ],
        ]);
    }
}