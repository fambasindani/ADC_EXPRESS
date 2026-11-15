<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\HistoriqueColis;
use App\Models\JournalActivite;
use App\Models\Livraison;
use App\Models\Notification;
use App\Models\OtpCode;
use App\Models\PreuveLivraison;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class LivraisonController extends Controller
{
    /** GET /api/livraisons */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Livraison::with([
            'colis:id,numero_suivi,nom_expediteur,nom_destinataire,telephone_destinataire,mode_facturation,montant_transport,devise_paiement',
            'livreur:id,nom,prenom,telephone',
            'devise:code,symbole',
            'preuve',
        ]);

        // Restriction : un livreur ne voit QUE ses livraisons
        if ($user->hasRole('LIVREUR')) {
            $query->where('livreur_id', $user->id);
        } elseif (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->whereHas('colis', fn($c) => $c
                ->where('agence_depot_id', $user->agence_id)
                ->orWhere('agence_destination_id', $user->agence_id));
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q
                ->where('adresse_livraison', 'like', "%{$s}%")
                ->orWhereHas('colis', fn($c) => $c
                    ->where('numero_suivi', 'like', "%{$s}%")
                    ->orWhere('nom_destinataire', 'like', "%{$s}%")));
        }

        if ($request->filled('statut'))     $query->where('statut', $request->statut);
        if ($request->filled('livreur_id')) $query->where('livreur_id', $request->livreur_id);
        if ($request->filled('date_start')) $query->whereDate('date_affectation', '>=', $request->date_start);
        if ($request->filled('date_end'))   $query->whereDate('date_affectation', '<=', $request->date_end);

        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $items   = $query->orderByDesc('date_affectation')->paginate($perPage);

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

    /** POST /api/livraisons — affecter un colis à un livreur */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'           => 'required|exists:colis,id',
            'livreur_id'         => 'required|exists:users,id',
            'adresse_livraison'  => 'required|string|max:255',
            'frais_livraison'    => 'nullable|numeric|min:0',
            'devise_code'        => 'required|exists:devises,code',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $livraison = DB::transaction(function () use ($request) {
                $colis   = Colis::lockForUpdate()->findOrFail($request->colis_id);
                $livreur = User::findOrFail($request->livreur_id);

                if (! $livreur->hasRole('LIVREUR')) {
                    throw new \Exception('L\'utilisateur sélectionné n\'est pas un livreur.');
                }

                if (! in_array($colis->statut, ['ARRIVE_AGENCE', 'PRET_EXPEDITION'])) {
                    throw new \Exception("Le colis doit être en ARRIVE_AGENCE pour être livré (statut : {$colis->statut}).");
                }

                if ($colis->livraisons()->whereIn('statut', ['A_AFFECTER', 'EN_COURS'])->exists()) {
                    throw new \Exception('Ce colis a déjà une livraison en cours.');
                }

                // Blocage PAYE_AU_RETRAIT impayé
                if ($colis->mode_facturation === 'PAYE_AU_RETRAIT' && ! $colis->estPaye()) {
                    throw new \Exception(
                        "Livraison impossible : colis PAYE_AU_RETRAIT non soldé. Solde : {$colis->solde} {$colis->devise_paiement}."
                    );
                }

                $livraison = Livraison::create([
                    'colis_id'           => $colis->id,
                    'livreur_id'         => $livreur->id,
                    'adresse_livraison'  => $request->adresse_livraison,
                    'date_affectation'   => now(),
                    'statut'             => 'EN_COURS',
                    'frais_livraison'    => $request->input('frais_livraison', 0),
                    'devise_code'        => $request->devise_code,
                ]);

                $ancienStatut = $colis->statut;
                $colis->update(['statut' => 'EN_LIVRAISON']);

                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $colis->agence_destination_id,
                    'user_id'        => $request->user()->id,
                    'ancien_statut'  => $ancienStatut,
                    'nouveau_statut' => 'EN_LIVRAISON',
                    'commentaire'    => "Affecté au livreur {$livreur->nom_complet}",
                ]);

                Notification::creer(
                    $livreur->id,
                    $colis->id,
                    'APPLICATION',
                    "Vous avez une nouvelle livraison à effectuer (colis {$colis->numero_suivi}).",
                    'Nouvelle livraison affectée'
                );

                return $livraison;
            });

            return response()->json([
                'success' => true,
                'message' => 'Livraison affectée.',
                'data'    => $livraison->load('colis', 'livreur', 'devise'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /** GET /api/livraisons/colis-disponibles — colis pouvant être affectés à un livreur */
    public function colisDisponibles(Request $request)
    {
        $user  = $request->user();
        $query = Colis::with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->whereIn('statut', ['ARRIVE_AGENCE', 'PRET_EXPEDITION'])
            ->whereDoesntHave('livraisons', fn ($q) => $q->whereIn('statut', ['A_AFFECTER', 'EN_COURS']));

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where(fn ($q) => $q
                ->where('agence_depot_id', $user->agence_id)
                ->orWhere('agence_destination_id', $user->agence_id));
        }

        $colis = $query->orderByDesc('date_depot')->get();

        $colis->each(function (Colis $c) {
            $c->append(['montant_paye', 'solde']);
            $c->setAttribute('est_paye', $c->estPaye());
            $c->setAttribute('livraison_bloquee', $c->mode_facturation === 'PAYE_AU_RETRAIT' && ! $c->estPaye());
        });

        return response()->json([
            'success' => true,
            'data'    => $colis,
        ]);
    }

    /** GET /api/livraisons/{id} */
    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data'    => Livraison::with([
                'colis.agenceDepot', 'colis.agenceDestination', 'colis.typeColis',
                'colis.paiements', 'livreur:id,nom,prenom,telephone', 'preuve', 'devise',
            ])->findOrFail($id),
        ]);
    }

    /** PUT /api/livraisons/{id} — modifier adresse/frais */
    public function update(Request $request, $id)
    {
        $livraison = Livraison::findOrFail($id);

        if ($livraison->statut === 'LIVRE') {
            return response()->json(['success' => false, 'message' => 'Livraison déjà finalisée.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'adresse_livraison' => 'sometimes|required|string|max:255',
            'frais_livraison'   => 'nullable|numeric|min:0',
            'livreur_id'        => 'sometimes|required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $livraison->update($request->only(['adresse_livraison', 'frais_livraison', 'livreur_id']));

        return response()->json([
            'success' => true,
            'message' => 'Livraison mise à jour.',
            'data'    => $livraison->fresh()->load('colis', 'livreur'),
        ]);
    }

    /** DELETE /api/livraisons/{id} — annuler (seulement avant EN_COURS) */
    public function destroy($id)
    {
        $livraison = Livraison::findOrFail($id);

        if (in_array($livraison->statut, ['LIVRE', 'ECHEC'])) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible d\'annuler une livraison déjà finalisée.',
            ], 422);
        }

        DB::transaction(function () use ($livraison) {
            $colis = $livraison->colis;
            $ancienStatut = $colis->statut;

            $livraison->delete();
            $colis->update(['statut' => 'ARRIVE_AGENCE']);

            HistoriqueColis::create([
                'colis_id'       => $colis->id,
                'agence_id'      => $colis->agence_destination_id,
                'user_id'        => auth()->id(),
                'ancien_statut'  => $ancienStatut,
                'nouveau_statut' => 'ARRIVE_AGENCE',
                'commentaire'    => 'Livraison annulée',
            ]);
        });

        return response()->json(['success' => true, 'message' => 'Livraison annulée.']);
    }

    /**
     * POST /api/livraisons/{id}/tenter
     * Enregistre une tentative de livraison.
     */
    public function tenter(Request $request, $id)
    {
        $livraison = Livraison::findOrFail($id);

        if ($livraison->statut !== 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'La livraison doit être EN_COURS.',
            ], 422);
        }

        $livraison->update(['date_tentative' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Tentative enregistrée.',
            'data'    => $livraison->fresh(),
        ]);
    }

    /**
     * POST /api/livraisons/{id}/marquer-echec
     */
    public function marquerEchec(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'motif_echec' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $livraison = Livraison::findOrFail($id);

        if ($livraison->statut !== 'EN_COURS') {
            return response()->json(['success' => false, 'message' => 'Statut invalide.'], 422);
        }

        DB::transaction(function () use ($livraison, $request) {
            $colis = $livraison->colis;
            $ancienStatut = $colis->statut;

            $livraison->update([
                'statut'        => 'ECHEC',
                'motif_echec'   => $request->motif_echec,
                'date_tentative' => now(),
            ]);

            $colis->update(['statut' => 'ARRIVE_AGENCE']);

            HistoriqueColis::create([
                'colis_id'       => $colis->id,
                'agence_id'      => $colis->agence_destination_id,
                'user_id'        => $request->user()->id,
                'ancien_statut'  => $ancienStatut,
                'nouveau_statut' => 'ARRIVE_AGENCE',
                'commentaire'    => "Échec de livraison : {$request->motif_echec}",
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Échec enregistré.',
            'data'    => $livraison->fresh(),
        ]);
    }

    /**
     * POST /api/livraisons/{id}/reprogrammer
     */
    public function reprogrammer(Request $request, $id)
    {
        $livraison = Livraison::findOrFail($id);

        if (! in_array($livraison->statut, ['ECHEC', 'REPROGRAMME'])) {
            return response()->json(['success' => false, 'message' => 'Statut invalide.'], 422);
        }

        $validator = Validator::make($request->all(), [
            'livreur_id' => 'sometimes|required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        DB::transaction(function () use ($livraison, $request) {
            $livraison->update([
                'statut'         => 'EN_COURS',
                'date_affectation' => now(),
                'livreur_id'     => $request->input('livreur_id', $livraison->livreur_id),
                'motif_echec'    => null,
            ]);
            $livraison->colis->update(['statut' => 'EN_LIVRAISON']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Livraison reprogrammée.',
            'data'    => $livraison->fresh(),
        ]);
    }

    /**
     * POST /api/livraisons/{id}/livrer
     * Finalise une livraison : vérifie l'OTP, enregistre la preuve,
     * clôture le colis (statut LIVRE).
     */
    public function livrer(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nom_receptionnaire'       => 'required|string|max:180',
            'telephone_receptionnaire' => 'nullable|string|max:30',
            'signature_path'           => 'nullable|string|max:255',
            'photo_path'               => 'nullable|string|max:255',
            'otp_code'                 => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $livraison = Livraison::findOrFail($id);

        if ($livraison->statut !== 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'La livraison doit être EN_COURS pour être finalisée.',
            ], 422);
        }

        $colis = $livraison->colis;

        // 🔒 Vérification OTP avant remise
        if (! OtpCode::verifier($colis->id, 'LIVRAISON', $request->otp_code)) {
            return response()->json([
                'success' => false,
                'message' => 'Code OTP invalide ou expiré. Livraison impossible.',
            ], 422);
        }

        DB::transaction(function () use ($livraison, $colis, $request) {
            $user = $request->user();

            PreuveLivraison::create([
                'livraison_id'            => $livraison->id,
                'nom_receptionnaire'      => $request->nom_receptionnaire,
                'telephone_receptionnaire' => $request->telephone_receptionnaire,
                'signature_path'          => $request->signature_path,
                'photo_path'              => $request->photo_path,
                'code_otp_verifie'        => true,
                'date_preuve'             => now(),
            ]);

            $ancienStatut = $colis->statut;
            $livraison->update([
                'statut'         => 'LIVRE',
                'date_livraison' => now(),
            ]);
            $colis->update([
                'statut'       => 'LIVRE',
                'date_cloture' => now(),
            ]);

            HistoriqueColis::create([
                'colis_id'       => $colis->id,
                'agence_id'      => $colis->agence_destination_id,
                'user_id'        => $user->id,
                'ancien_statut'  => $ancienStatut,
                'nouveau_statut' => 'LIVRE',
                'commentaire'    => "Livré à {$request->nom_receptionnaire}",
            ]);

            Notification::creer(
                null,
                $colis->id,
                'APPLICATION',
                "Le colis {$colis->numero_suivi} a été livré.",
                'Colis livré'
            );

            JournalActivite::enregistrer(
                'livraison.livrer',
                'livraisons',
                $livraison->id,
                ['colis_id' => $colis->id],
                $user
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Livraison finalisée. Colis remis au réceptionnaire.',
            'data'    => $livraison->fresh()->load('colis', 'preuve'),
        ]);
    }

    /** GET /api/livraisons/mes-livraisons — pour le livreur connecté */
    public function mesLivraisons(Request $request)
    {
        $user = $request->user();

        $query = Livraison::with(['colis:id,numero_suivi,nom_destinataire,telephone_destinataire,adresse_destinataire'])
            ->where('livreur_id', $user->id)
            ->orderByDesc('date_affectation');

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->get(),
        ]);
    }

    /** GET /api/livraisons/form-data */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'livreurs' => User::whereHas('roles', fn($q) => $q->where('code', 'LIVREUR'))
                    ->where('statut', 'ACTIF')
                    ->orderBy('nom')
                    ->get(['id', 'nom', 'postnom', 'prenom', 'telephone']),
                'devises'  => \App\Models\Devise::where('actif', true)->get(['code', 'nom', 'symbole']),
                'statuts'  => ['A_AFFECTER', 'EN_COURS', 'LIVRE', 'ECHEC', 'REPROGRAMME'],
            ],
        ]);
    }

    /** GET /api/livraisons/stats */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = Livraison::query();

        if ($user->hasRole('LIVREUR')) {
            $query->where('livreur_id', $user->id);
        } elseif (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->whereHas('colis', fn($c) => $c
                ->where('agence_depot_id', $user->agence_id)
                ->orWhere('agence_destination_id', $user->agence_id));
        }

        if ($request->filled('date_start')) $query->whereDate('date_affectation', '>=', $request->date_start);
        if ($request->filled('date_end'))   $query->whereDate('date_affectation', '<=', $request->date_end);

        return response()->json([
            'success' => true,
            'data'    => [
                'total'        => (clone $query)->count(),
                'en_cours'     => (clone $query)->where('statut', 'EN_COURS')->count(),
                'livrees'      => (clone $query)->where('statut', 'LIVRE')->count(),
                'echecs'       => (clone $query)->where('statut', 'ECHEC')->count(),
                'aujourd_hui'  => (clone $query)->whereDate('date_affectation', now()->toDateString())->count(),
            ],
        ]);
    }
}