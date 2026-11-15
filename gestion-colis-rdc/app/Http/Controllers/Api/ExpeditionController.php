<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Colis;
use App\Models\Expedition;
use App\Models\HistoriqueColis;
use App\Models\Sequence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ExpeditionController extends Controller
{
    /**
     * GET /api/expeditions
     *
     * Query params :
     *   - search            : reference, transporteur, chauffeur, agences
     *   - statut            : PLANIFIEE | EN_COURS | ARRIVEE | ANNULEE
     *   - mode_transport    : ROUTE | AERIEN | FERROVIAIRE | FLUVIAL | AUTRE
     *   - agence_depart_id  : filtre
     *   - agence_arrivee_id : filtre
     *   - date_start        : date_depart >= Y-m-d
     *   - date_end          : date_depart <= Y-m-d
     *   - sort_by           : date_depart | created_at | reference (défaut: date_depart)
     *   - sort_dir          : asc | desc (défaut: desc)
     *   - per_page          : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Expedition::with([
            'agenceDepart:id,code,nom',
            'agenceArrivee:id,code,nom',
            'createur:id,nom,prenom',
        ])->withCount('colis');

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
                $q->where('reference', 'like', "%{$s}%")
                  ->orWhere('transporteur', 'like', "%{$s}%")
                  ->orWhere('chauffeur_nom', 'like', "%{$s}%")
                  ->orWhereHas('agenceDepart', fn($a) => $a
                      ->where('code', 'like', "%{$s}%")
                      ->orWhere('nom', 'like', "%{$s}%"))
                  ->orWhereHas('agenceArrivee', fn($a) => $a
                      ->where('code', 'like', "%{$s}%")
                      ->orWhere('nom', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut') && in_array($request->statut, ['PLANIFIEE', 'EN_COURS', 'ARRIVEE', 'ANNULEE'])) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('mode_transport')) {
            $query->where('mode_transport', $request->mode_transport);
        }
        if ($request->filled('agence_depart_id')) {
            $query->where('agence_depart_id', $request->agence_depart_id);
        }
        if ($request->filled('agence_arrivee_id')) {
            $query->where('agence_arrivee_id', $request->agence_arrivee_id);
        }
        if ($request->filled('date_start')) {
            $query->whereDate('date_depart', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_depart', '<=', $request->date_end);
        }

        // 📊 Tri
        $allowedSorts = ['date_depart', 'created_at', 'reference'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_depart';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage    = min(max((int) $request->get('per_page', 15), 5), 100);
        $expeditions = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $expeditions->items(),
            'meta'    => [
                'current_page' => $expeditions->currentPage(),
                'per_page'     => $expeditions->perPage(),
                'total'        => $expeditions->total(),
                'last_page'    => $expeditions->lastPage(),
                'from'         => $expeditions->firstItem(),
                'to'           => $expeditions->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/expeditions
     * Crée une expédition (convoi) vide.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'agence_depart_id'      => 'required|exists:agences,id',
            'agence_arrivee_id'     => 'required|exists:agences,id|different:agence_depart_id',
            'mode_transport'        => ['nullable', Rule::in(['ROUTE', 'AERIEN', 'FERROVIAIRE', 'FLUVIAL', 'AUTRE'])],
            'transporteur'          => 'nullable|string|max:150',
            'numero_moyen_transport' => 'nullable|string|max:80',
            'chauffeur_nom'         => 'nullable|string|max:150',
            'chauffeur_telephone'   => 'nullable|string|max:30',
            'date_depart'           => 'nullable|date',
            'date_arrivee_prevue'   => 'nullable|date|after_or_equal:date_depart',
            'statut'                => ['nullable', Rule::in(['PLANIFIEE', 'EN_COURS', 'ARRIVEE', 'ANNULEE'])],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $expedition = Expedition::create([
                'reference'              => Sequence::next('expedition'),
                'agence_depart_id'       => $request->agence_depart_id,
                'agence_arrivee_id'      => $request->agence_arrivee_id,
                'mode_transport'         => $request->input('mode_transport', 'ROUTE'),
                'transporteur'           => $request->transporteur,
                'numero_moyen_transport' => $request->numero_moyen_transport,
                'chauffeur_nom'          => $request->chauffeur_nom,
                'chauffeur_telephone'    => $request->chauffeur_telephone,
                'date_depart'            => $request->date_depart,
                'date_arrivee_prevue'    => $request->date_arrivee_prevue,
                'statut'                 => $request->input('statut', 'PLANIFIEE'),
                'cree_par'               => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Expédition créée avec succès.',
                'data'    => $expedition->load('agenceDepart', 'agenceArrivee', 'createur'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/expeditions/{id}
     */
    public function show($id)
    {
        $expedition = Expedition::with([
            'agenceDepart',
            'agenceArrivee',
            'createur:id,nom,prenom',
            'colis' => fn ($q) => $q->with([
                'agenceDepot:id,code,nom',
                'agenceDestination:id,code,nom',
            ]),
        ])->withCount('colis')->findOrFail($id);

        return response()->json(['success' => true, 'data' => $expedition]);
    }

    /**
     * PUT /api/expeditions/{id}
     */
    public function update(Request $request, $id)
    {
        $expedition = Expedition::findOrFail($id);

        if (in_array($expedition->statut, ['ARRIVEE', 'ANNULEE'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cette expédition est clôturée et ne peut plus être modifiée.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'agence_depart_id'       => 'sometimes|required|exists:agences,id',
            'agence_arrivee_id'      => 'sometimes|required|exists:agences,id',
            'mode_transport'         => ['nullable', Rule::in(['ROUTE', 'AERIEN', 'FERROVIAIRE', 'FLUVIAL', 'AUTRE'])],
            'transporteur'           => 'nullable|string|max:150',
            'numero_moyen_transport' => 'nullable|string|max:80',
            'chauffeur_nom'          => 'nullable|string|max:150',
            'chauffeur_telephone'    => 'nullable|string|max:30',
            'date_depart'            => 'nullable|date',
            'date_arrivee_prevue'    => 'nullable|date',
            'date_arrivee_reelle'    => 'nullable|date',
            'statut'                 => ['nullable', Rule::in(['PLANIFIEE', 'EN_COURS', 'ARRIVEE', 'ANNULEE'])],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $expedition->update($request->only([
            'agence_depart_id', 'agence_arrivee_id', 'mode_transport',
            'transporteur', 'numero_moyen_transport', 'chauffeur_nom',
            'chauffeur_telephone', 'date_depart', 'date_arrivee_prevue',
            'date_arrivee_reelle', 'statut',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Expédition mise à jour.',
            'data'    => $expedition->fresh()->load('agenceDepart', 'agenceArrivee'),
        ]);
    }

    /**
     * DELETE /api/expeditions/{id}
     */
    public function destroy($id)
    {
        $expedition = Expedition::findOrFail($id);

        if ($expedition->statut === 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'Une expédition EN_COURS ne peut pas être supprimée.',
            ], 422);
        }

        if ($expedition->colis()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette expédition contient des colis.',
            ], 409);
        }

        $expedition->delete();

        return response()->json(['success' => true, 'message' => 'Expédition supprimée.']);
    }

    /**
     * POST /api/expeditions/{id}/charger-colis
     * Charge un ou plusieurs colis dans l'expédition.
     * Body : { "colis_ids": [2, 3, 4] }
     */
    public function chargerColis(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'colis_ids'   => 'required|array|min:1',
            'colis_ids.*' => 'integer|exists:colis,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $expedition = Expedition::findOrFail($id);

        if (in_array($expedition->statut, ['ARRIVEE', 'ANNULEE'])) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de charger des colis sur une expédition clôturée.',
            ], 422);
        }

        try {
            $charges = DB::transaction(function () use ($expedition, $request) {
                $charges = [];

                foreach ($request->colis_ids as $colisId) {
                    $colis = Colis::lockForUpdate()->find($colisId);
                    if (! $colis) continue;

                    // Vérifier que le colis n'est pas déjà dans une autre expédition active
                    $dejaCharge = DB::table('expedition_colis')
                        ->join('expeditions', 'expedition_colis.expedition_id', '=', 'expeditions.id')
                        ->where('expedition_colis.colis_id', $colis->id)
                        ->whereIn('expeditions.statut', ['PLANIFIEE', 'EN_COURS'])
                        ->where('expeditions.id', '!=', $expedition->id)
                        ->exists();

                    if ($dejaCharge) continue;

                    // Vérifier que le colis est bien dans la bonne agence de départ
                    if ($colis->agence_depot_id !== $expedition->agence_depart_id) continue;

                    // Vérifier le statut
                    if (! in_array($colis->statut, ['PRET_EXPEDITION', 'ENREGISTRE', 'EN_ATTENTE_PAIEMENT'])) {
                        continue;
                    }

                    // Attacher
                    DB::table('expedition_colis')->insert([
                        'expedition_id'   => $expedition->id,
                        'colis_id'        => $colis->id,
                        'date_chargement' => now(),
                    ]);

                    // Changer le statut du colis → EN_TRANSIT
                    $ancienStatut = $colis->statut;
                    $colis->update(['statut' => 'EN_TRANSIT']);
                    $colis->synchroniserLivraisons();

                    // Historique
                    HistoriqueColis::create([
                        'colis_id'       => $colis->id,
                        'agence_id'      => $expedition->agence_depart_id,
                        'user_id'        => $request->user()->id,
                        'ancien_statut'  => $ancienStatut,
                        'nouveau_statut' => 'EN_TRANSIT',
                        'commentaire'    => "Chargé dans l'expédition {$expedition->reference}",
                    ]);

                    $charges[] = $colis->id;
                }

                return $charges;
            });

            return response()->json([
                'success' => true,
                'message' => count($charges) . ' colis chargé(s) dans l\'expédition.',
                'data'    => [
                    'expedition_id'   => $expedition->id,
                    'reference'       => $expedition->reference,
                    'colis_charges'   => $charges,
                    'total_charges'   => count($charges),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/expeditions/{id}/decharger-colis
     * Décharge un ou plusieurs colis de l'expédition (arrivée à destination).
     * Body : { "colis_ids": [2, 3] }
     */
    public function dechargerColis(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'colis_ids'   => 'required|array|min:1',
            'colis_ids.*' => 'integer|exists:colis,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $expedition = Expedition::findOrFail($id);

        try {
            $decharges = DB::transaction(function () use ($expedition, $request) {
                $decharges = [];

                foreach ($request->colis_ids as $colisId) {
                    $colis = Colis::lockForUpdate()->find($colisId);
                    if (! $colis) continue;

                    // Vérifier que le colis est bien dans cette expédition
                    $pivot = DB::table('expedition_colis')
                        ->where('expedition_id', $expedition->id)
                        ->where('colis_id', $colis->id)
                        ->first();

                    if (! $pivot) continue;

                    // Marquer la date de déchargement
                    DB::table('expedition_colis')
                        ->where('expedition_id', $expedition->id)
                        ->where('colis_id', $colis->id)
                        ->update(['date_dechargement' => now()]);

                    // Changer le statut du colis → ARRIVE_AGENCE
                    $ancienStatut = $colis->statut;
                    $colis->update([
                        'statut'      => 'ARRIVE_AGENCE',
                        'date_arrivee' => now(),
                    ]);

                    // Historique
                    HistoriqueColis::create([
                        'colis_id'       => $colis->id,
                        'agence_id'      => $expedition->agence_arrivee_id,
                        'user_id'        => $request->user()->id,
                        'ancien_statut'  => $ancienStatut,
                        'nouveau_statut' => 'ARRIVE_AGENCE',
                        'commentaire'    => "Déchargé de l'expédition {$expedition->reference}",
                    ]);

                    $decharges[] = $colis->id;
                }

                return $decharges;
            });

            return response()->json([
                'success' => true,
                'message' => count($decharges) . ' colis déchargé(s).',
                'data'    => [
                    'expedition_id' => $expedition->id,
                    'reference'     => $expedition->reference,
                    'colis_decharges' => $decharges,
                    'total_decharges' => count($decharges),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/expeditions/{id}/demarrer
     * Passe l'expédition en EN_COURS.
     */
    public function demarrer($id)
    {
        $expedition = Expedition::findOrFail($id);

        if ($expedition->statut !== 'PLANIFIEE') {
            return response()->json([
                'success' => false,
                'message' => 'Seules les expéditions PLANIFIEE peuvent être démarrées.',
            ], 422);
        }

        if (! $expedition->colis()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de démarrer : aucun colis chargé.',
            ], 422);
        }

        $expedition->update([
            'statut'      => 'EN_COURS',
            'date_depart' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expédition démarrée.',
            'data'    => $expedition->fresh(),
        ]);
    }

    /**
     * POST /api/expeditions/{id}/arriver
     * Passe l'expédition en ARRIVEE.
     */
    public function arriver($id)
    {
        $expedition = Expedition::findOrFail($id);

        if ($expedition->statut !== 'EN_COURS') {
            return response()->json([
                'success' => false,
                'message' => 'Seules les expéditions EN_COURS peuvent arriver.',
            ], 422);
        }

        $expedition->update([
            'statut'              => 'ARRIVEE',
            'date_arrivee_reelle' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expédition arrivée à destination.',
            'data'    => $expedition->fresh(),
        ]);
    }

    /**
     * POST /api/expeditions/{id}/annuler
     */
    public function annuler($id)
    {
        $expedition = Expedition::findOrFail($id);

        if (in_array($expedition->statut, ['ARRIVEE', 'ANNULEE'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cette expédition est déjà clôturée.',
            ], 422);
        }

        $expedition->update(['statut' => 'ANNULEE']);

        return response()->json([
            'success' => true,
            'message' => 'Expédition annulée.',
            'data'    => $expedition->fresh(),
        ]);
    }

    /**
     * GET /api/expeditions/{id}/colis
     */
    public function colis(Request $request, $id)
    {
        $expedition = Expedition::findOrFail($id);
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);

        $colis = $expedition->colis()
            ->with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $colis->items(),
            'meta'    => [
                'current_page' => $colis->currentPage(),
                'per_page'     => $colis->perPage(),
                'total'        => $colis->total(),
                'last_page'    => $colis->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/expeditions/form-data
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
                'agences'        => $agencesQuery->orderBy('nom')->get(['id', 'code', 'nom', 'type_agence']),
                'modes_transport' => ['ROUTE', 'AERIEN', 'FERROVIAIRE', 'FLUVIAL', 'AUTRE'],
                'statuts'        => ['PLANIFIEE', 'EN_COURS', 'ARRIVEE', 'ANNULEE'],
            ],
        ]);
    }

    /**
     * GET /api/expeditions/{id}/colis-disponibles
     * Liste les colis éligibles au chargement dans cette expédition.
     */
    public function colisDisponibles($id)
    {
        $expedition = Expedition::findOrFail($id);

        $colis = Colis::with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->where('agence_depot_id', $expedition->agence_depart_id)
            ->where('agence_destination_id', $expedition->agence_arrivee_id)
            ->whereIn('statut', ['PRET_EXPEDITION', 'ENREGISTRE', 'EN_ATTENTE_PAIEMENT'])
            ->whereDoesntHave('expeditions', fn($q) => $q->whereIn('expeditions.statut', ['PLANIFIEE', 'EN_COURS']))
            ->orderBy('date_depot')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $colis,
        ]);
    }
}