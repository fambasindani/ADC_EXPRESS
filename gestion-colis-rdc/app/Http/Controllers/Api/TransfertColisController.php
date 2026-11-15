<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Colis;
use App\Models\Expedition;
use App\Models\HistoriqueColis;
use App\Models\TransfertColis;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class TransfertColisController extends Controller
{
    /**
     * GET /api/transferts
     *
     * Query params :
     *   - search                : numéro suivi, agences
     *   - statut                : EN_ATTENTE | EXPEDIE | RECU | ANNULE
     *   - colis_id              : filtre par colis
     *   - agence_depart_id      : filtre
     *   - agence_arrivee_id     : filtre
     *   - expedition_id         : filtre
     *   - date_start            : date_transfert >= Y-m-d
     *   - date_end              : date_transfert <= Y-m-d
     *   - sort_by               : date_transfert | statut (défaut: date_transfert)
     *   - sort_dir              : asc | desc (défaut: desc)
     *   - per_page              : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = TransfertColis::with([
            'colis:id,numero_suivi,nom_expediteur,nom_destinataire,statut',
            'agenceDepart:id,code,nom',
            'agenceArrivee:id,code,nom',
            'expedition:id,reference,statut',
            'remisPar:id,nom,prenom',
            'recuPar:id,nom,prenom',
        ]);

        // 🔒 Restriction par agence
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where(function ($q) use ($user) {
                $q->where('agence_depart_id', $user->agence_id)
                  ->orWhere('agence_arrivee_id', $user->agence_id);
            });
        }

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->whereHas('colis', fn($c) => $c->where('numero_suivi', 'like', "%{$s}%"))
                  ->orWhereHas('agenceDepart', fn($a) => $a->where('code', 'like', "%{$s}%")->orWhere('nom', 'like', "%{$s}%"))
                  ->orWhereHas('agenceArrivee', fn($a) => $a->where('code', 'like', "%{$s}%")->orWhere('nom', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut') && in_array($request->statut, ['EN_ATTENTE', 'EXPEDIE', 'RECU', 'ANNULE'])) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('colis_id')) {
            $query->where('colis_id', $request->colis_id);
        }
        if ($request->filled('agence_depart_id')) {
            $query->where('agence_depart_id', $request->agence_depart_id);
        }
        if ($request->filled('agence_arrivee_id')) {
            $query->where('agence_arrivee_id', $request->agence_arrivee_id);
        }
        if ($request->filled('expedition_id')) {
            $query->where('expedition_id', $request->expedition_id);
        }
        if ($request->filled('date_start')) {
            $query->whereDate('date_transfert', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_transfert', '<=', $request->date_end);
        }

        // 📊 Tri
        $allowedSorts = ['date_transfert', 'statut'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_transfert';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage  = min(max((int) $request->get('per_page', 15), 5), 100);
        $transferts = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $transferts->items(),
            'meta'    => [
                'current_page' => $transferts->currentPage(),
                'per_page'     => $transferts->perPage(),
                'total'        => $transferts->total(),
                'last_page'    => $transferts->lastPage(),
                'from'         => $transferts->firstItem(),
                'to'           => $transferts->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/transferts
     * Crée un transfert de colis vers une autre agence.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'          => 'required|exists:colis,id',
            'agence_depart_id'  => 'required|exists:agences,id',
            'agence_arrivee_id' => 'required|exists:agences,id|different:agence_depart_id',
            'expedition_id'     => 'nullable|exists:expeditions,id',
            'observations'      => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $transfert = DB::transaction(function () use ($request) {
                $user  = $request->user();
                $colis = Colis::lockForUpdate()->findOrFail($request->colis_id);

                // 🔒 Vérifier que le colis n'est pas déjà dans un transfert actif
                $transfertActif = TransfertColis::where('colis_id', $colis->id)
                    ->whereIn('statut', ['EN_ATTENTE', 'EXPEDIE'])
                    ->exists();

                if ($transfertActif) {
                    throw new \Exception('Ce colis est déjà dans un transfert actif.');
                }

                // 🔒 Vérifier que le colis est bien dans l'agence de départ
                if ($colis->agence_depot_id !== $request->agence_depart_id) {
                    throw new \Exception("Le colis n'est pas dans l'agence de départ spécifiée.");
                }

                // 🔒 Statuts autorisés pour transfert
                if (! in_array($colis->statut, ['PRET_EXPEDITION', 'ARRIVE_AGENCE', 'ENREGISTRE'])) {
                    throw new \Exception("Le colis est en statut {$colis->statut}, transfert impossible.");
                }

                $transfert = TransfertColis::create([
                    'colis_id'          => $colis->id,
                    'agence_depart_id'  => $request->agence_depart_id,
                    'agence_arrivee_id' => $request->agence_arrivee_id,
                    'expedition_id'     => $request->expedition_id,
                    'date_transfert'    => now(),
                    'remis_par'         => $user->id,
                    'statut'            => 'EN_ATTENTE',
                    'observations'      => $request->observations,
                ]);

                return $transfert;
            });

            return response()->json([
                'success' => true,
                'message' => 'Transfert créé avec succès.',
                'data'    => $transfert->load('colis', 'agenceDepart', 'agenceArrivee', 'expedition', 'remisPar'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/transferts/{id}
     */
    public function show($id)
    {
        $transfert = TransfertColis::with([
            'colis.agenceDepot:id,code,nom',
            'colis.agenceDestination:id,code,nom',
            'colis.villeDestination:id,nom',
            'agenceDepart:id,code,nom',
            'agenceArrivee:id,code,nom',
            'expedition:id,reference,statut',
            'remisPar:id,nom,prenom',
            'recuPar:id,nom,prenom',
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $transfert]);
    }

    /**
     * PUT /api/transferts/{id}
     * Modification uniquement si EN_ATTENTE.
     */
    public function update(Request $request, $id)
    {
        $transfert = TransfertColis::findOrFail($id);

        if ($transfert->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les transferts EN_ATTENTE peuvent être modifiés.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'agence_arrivee_id' => 'sometimes|required|exists:agences,id',
            'expedition_id'     => 'nullable|exists:expeditions,id',
            'observations'      => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $transfert->update($request->only(['agence_arrivee_id', 'expedition_id', 'observations']));

        return response()->json([
            'success' => true,
            'message' => 'Transfert mis à jour.',
            'data'    => $transfert->fresh()->load('colis', 'agenceDepart', 'agenceArrivee'),
        ]);
    }

    /**
     * DELETE /api/transferts/{id}
     * Annule un transfert (seulement EN_ATTENTE).
     */
    public function destroy($id)
    {
        $transfert = TransfertColis::findOrFail($id);

        if ($transfert->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les transferts EN_ATTENTE peuvent être annulés.',
            ], 422);
        }

        $transfert->update(['statut' => 'ANNULE']);

        return response()->json([
            'success' => true,
            'message' => 'Transfert annulé.',
            'data'    => $transfert->fresh(),
        ]);
    }

    /**
     * POST /api/transferts/{id}/expedier
     * Passe le transfert EN_ATTENTE → EXPEDIE.
     */
    public function expedier(Request $request, $id)
    {
        $transfert = TransfertColis::findOrFail($id);

        if ($transfert->statut !== 'EN_ATTENTE') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les transferts EN_ATTENTE peuvent être expédiés.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($transfert, $request) {
                $colis = $transfert->colis;

                $transfert->update(['statut' => 'EXPEDIE']);

                // Historique
                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $transfert->agence_depart_id,
                    'user_id'        => $request->user()->id,
                    'ancien_statut'  => $colis->statut,
                    'nouveau_statut' => 'EN_TRANSIT',
                    'commentaire'    => "Transféré de {$transfert->agenceDepart->code} vers {$transfert->agenceArrivee->code}",
                ]);

                $colis->update(['statut' => 'EN_TRANSIT']);
                $colis->synchroniserLivraisons();
            });

            return response()->json([
                'success' => true,
                'message' => 'Transfert expédié. Colis en transit.',
                'data'    => $transfert->fresh()->load('colis'),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/transferts/{id}/recevoir
     * Passe le transfert EXPEDIE → RECU.
     */
    public function recevoir(Request $request, $id)
    {
        $transfert = TransfertColis::findOrFail($id);

        if ($transfert->statut !== 'EXPEDIE') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les transferts EXPEDIE peuvent être reçus.',
            ], 422);
        }

        // 🔒 Vérifier que l'utilisateur est dans l'agence d'arrivée
        $user = $request->user();
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN')) {
            if ($user->agence_id !== $transfert->agence_arrivee_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Seule l\'agence de destination peut réceptionner ce transfert.',
                ], 403);
            }
        }

        try {
            DB::transaction(function () use ($transfert, $user) {
                $colis = $transfert->colis;

                $transfert->update([
                    'statut'         => 'RECU',
                    'date_reception' => now(),
                    'recu_par'       => $user->id,
                ]);

                $colis->update([
                    'statut'       => 'ARRIVE_AGENCE',
                    'date_arrivee' => now(),
                ]);

                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $transfert->agence_arrivee_id,
                    'user_id'        => $user->id,
                    'ancien_statut'  => 'EN_TRANSIT',
                    'nouveau_statut' => 'ARRIVE_AGENCE',
                    'commentaire'    => "Reçu via transfert de {$transfert->agenceDepart->code}",
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Transfert réceptionné. Colis arrivé en agence.',
                'data'    => $transfert->fresh()->load('colis', 'recuPar'),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/transferts/form-data
     */
    public function formData(Request $request)
    {
        $user = $request->user();

        $agencesQuery = Agence::where('actif', true);
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $agencesQuery->where('id', $user->agence_id);
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'agences'    => $agencesQuery->orderBy('nom')->get(['id', 'code', 'nom', 'type_agence']),
                'statuts'    => ['EN_ATTENTE', 'EXPEDIE', 'RECU', 'ANNULE'],
                'expeditions' => Expedition::whereIn('statut', ['PLANIFIEE', 'EN_COURS'])
                                    ->orderByDesc('date_depart')
                                    ->get(['id', 'reference', 'statut']),
            ],
        ]);
    }

    /**
     * GET /api/transferts/colis-disponibles
     * Colis pouvant faire l'objet d'un nouveau transfert.
     */
    public function colisDisponibles(Request $request)
    {
        $user  = $request->user();
        $query = Colis::with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->whereIn('statut', ['PRET_EXPEDITION', 'ARRIVE_AGENCE', 'ENREGISTRE'])
            ->whereDoesntHave('transferts', fn ($q) => $q->whereIn('statut', ['EN_ATTENTE', 'EXPEDIE']));

        if ($request->filled('agence_id')) {
            $query->where('agence_depot_id', $request->agence_id);
        } elseif (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_depot_id', $user->agence_id);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderByDesc('date_depot')->get(),
        ]);
    }

    /**
     * GET /api/transferts/par-colis/{colisId}
     */
    public function parColis($colisId)
    {
        $colis = Colis::findOrFail($colisId);

        $transferts = $colis->transferts()
            ->with(['agenceDepart:id,code,nom', 'agenceArrivee:id,code,nom', 'remisPar:id,nom', 'recuPar:id,nom'])
            ->orderByDesc('date_transfert')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $transferts,
        ]);
    }

    /**
     * GET /api/transferts/en-attente-reception
     * Liste les transferts EXPEDIE en attente de réception dans l'agence de l'utilisateur.
     */
    public function enAttenteReception(Request $request)
    {
        $user = $request->user();

        $query = TransfertColis::with(['colis:id,numero_suivi,nom_destinataire', 'agenceDepart:id,code,nom'])
            ->where('statut', 'EXPEDIE');

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_arrivee_id', $user->agence_id);
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderBy('date_transfert')->get(),
        ]);
    }
}