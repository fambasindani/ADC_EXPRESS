<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Ville;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AgenceController extends Controller
{
    /**
     * GET /api/agences
     *
     * Query params :
     *   - search       : recherche (code, nom, adresse, téléphone)
     *   - type_agence  : SIEGE | PRINCIPALE | SECONDAIRE | POINT_RELAIS
     *   - province_id  : filtre par province
     *   - ville_id     : filtre par ville
     *   - actif        : true | false
     *   - sort_by      : nom | code | created_at (défaut: nom)
     *   - sort_dir     : asc | desc (défaut: asc)
     *   - per_page     : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $query = Agence::with([
            'province:id,code,nom',
            'ville:id,nom',
            'commune:id,nom',
            'parent:id,code,nom',
        ]);

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('nom', 'like', "%{$s}%")
                  ->orWhere('adresse', 'like', "%{$s}%")
                  ->orWhere('telephone', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%");
            });
        }

        // 🎯 Filtres
        if ($request->filled('type_agence') && in_array($request->type_agence, ['SIEGE', 'PRINCIPALE', 'SECONDAIRE', 'POINT_RELAIS'])) {
            $query->where('type_agence', $request->type_agence);
        }
        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }
        if ($request->filled('ville_id')) {
            $query->where('ville_id', $request->ville_id);
        }
        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        // 📊 Tri
        $allowedSorts = ['nom', 'code', 'created_at', 'type_agence'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'nom';
        $sortDir = $request->get('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $agences = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $agences->items(),
            'meta'    => [
                'current_page' => $agences->currentPage(),
                'per_page'     => $agences->perPage(),
                'total'        => $agences->total(),
                'last_page'    => $agences->lastPage(),
                'from'         => $agences->firstItem(),
                'to'           => $agences->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/agences
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'             => 'required|string|max:30|unique:agences,code',
            'nom'              => 'required|string|max:150',
            'province_id'      => 'required|exists:provinces,id',
            'ville_id'         => 'required|exists:villes,id',
            'commune_id'       => 'nullable|exists:communes,id',
            'adresse'          => 'required|string|max:255',
            'telephone'        => 'nullable|string|max:30',
            'email'            => 'nullable|email|max:150',
            'type_agence'      => ['nullable', Rule::in(['SIEGE', 'PRINCIPALE', 'SECONDAIRE', 'POINT_RELAIS'])],
            'agence_parent_id' => 'nullable|exists:agences,id',
            'actif'            => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $agence = Agence::create([
                'code'             => $request->code,
                'nom'              => $request->nom,
                'province_id'      => $request->province_id,
                'ville_id'         => $request->ville_id,
                'commune_id'       => $request->commune_id,
                'adresse'          => $request->adresse,
                'telephone'        => $request->telephone,
                'email'            => $request->email,
                'type_agence'      => $request->input('type_agence', 'SECONDAIRE'),
                'agence_parent_id' => $request->agence_parent_id,
                'actif'            => $request->input('actif', true),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Agence créée avec succès.',
                'data'    => $agence->load('province', 'ville', 'commune', 'parent'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/agences/{id}
     * Inclut les statistiques de l'agence (colis, paiements, users, caisses).
     */
    public function show($id)
    {
        $agence = Agence::with([
            'province:id,code,nom',
            'ville:id,nom',
            'commune:id,nom',
            'parent:id,code,nom',
            'enfants:id,code,nom,type_agence',
            'users:id,agence_id,nom,postnom,prenom,email,statut',
        ])->findOrFail($id);

        // Statistiques agrégées
        $stats = [
            'total_colis_depot'   => $agence->colisDepot()->count(),
            'total_colis_dest'    => $agence->colisDestination()->count(),
            'total_paiements'     => $agence->paiements()->where('statut', 'VALIDE')->count(),
            'total_retraits'      => $agence->retraits()->count(),
            'total_users'         => $agence->users()->count(),
            'total_caisses'       => $agence->caisses()->count(),
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'agence' => $agence,
                'stats'  => $stats,
            ],
        ]);
    }

    /**
     * PUT /api/agences/{id}
     */
    public function update(Request $request, $id)
    {
        $agence = Agence::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'             => ['sometimes', 'required', 'string', 'max:30', Rule::unique('agences', 'code')->ignore($agence->id)],
            'nom'              => 'sometimes|required|string|max:150',
            'province_id'      => 'sometimes|required|exists:provinces,id',
            'ville_id'         => 'sometimes|required|exists:villes,id',
            'commune_id'       => 'nullable|exists:communes,id',
            'adresse'          => 'sometimes|required|string|max:255',
            'telephone'        => 'nullable|string|max:30',
            'email'            => 'nullable|email|max:150',
            'type_agence'      => ['nullable', Rule::in(['SIEGE', 'PRINCIPALE', 'SECONDAIRE', 'POINT_RELAIS'])],
            'agence_parent_id' => 'nullable|exists:agences,id',
            'actif'            => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $agence->update($request->only([
            'code', 'nom', 'province_id', 'ville_id', 'commune_id',
            'adresse', 'telephone', 'email', 'type_agence',
            'agence_parent_id', 'actif',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Agence mise à jour.',
            'data'    => $agence->fresh()->load('province', 'ville', 'commune', 'parent'),
        ]);
    }

    /**
     * DELETE /api/agences/{id}
     * Refuse si l'agence a des colis, users ou caisses.
     */
    public function destroy($id)
    {
        $agence = Agence::findOrFail($id);

        if ($agence->type_agence === 'SIEGE') {
            return response()->json([
                'success' => false,
                'message' => 'L\'agence siège ne peut pas être supprimée.',
            ], 403);
        }

        $hasColis   = $agence->colisDepot()->exists() || $agence->colisDestination()->exists();
        $hasUsers   = $agence->users()->exists();
        $hasCaisses = $agence->caisses()->exists();

        if ($hasColis || $hasUsers || $hasCaisses) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette agence a des données liées (colis, utilisateurs ou caisses).',
                'details' => [
                    'has_colis'   => $hasColis,
                    'has_users'   => $hasUsers,
                    'has_caisses' => $hasCaisses,
                ],
            ], 409);
        }

        $agence->delete();

        return response()->json([
            'success' => true,
            'message' => 'Agence supprimée.',
        ]);
    }

    /**
     * GET /api/agences/form-data
     * Alimente le formulaire de création/modification.
     */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'provinces'    => Province::where('actif', true)
                                    ->orderBy('nom')
                                    ->get(['id', 'code', 'nom']),
                'villes'       => Ville::where('actif', true)
                                    ->with('province:id,code,nom')
                                    ->orderBy('nom')
                                    ->get(['id', 'nom', 'province_id']),
                'communes'     => Commune::where('actif', true)
                                    ->orderBy('nom')
                                    ->get(['id', 'nom', 'ville_id']),
                'types_agence' => ['SIEGE', 'PRINCIPALE', 'SECONDAIRE', 'POINT_RELAIS'],
                'agences_parentes' => Agence::where('actif', true)
                                    ->orderBy('nom')
                                    ->get(['id', 'code', 'nom', 'type_agence']),
            ],
        ]);
    }

    /**
     * GET /api/agences/{id}/statistiques
     * Statistiques détaillées d'une agence.
     */
    public function statistiques($id)
    {
        $agence = Agence::findOrFail($id);

        // Colis par statut
        $colisParStatut = $agence->colisDepot()
            ->select('statut', DB::raw('COUNT(*) as total'))
            ->groupBy('statut')
            ->pluck('total', 'statut');

        // Paiements des 30 derniers jours
        $paiements30j = $agence->paiements()
            ->where('statut', 'VALIDE')
            ->where('date_paiement', '>=', now()->subDays(30))
            ->select(
                DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant ELSE 0 END), 0) as total_usd'),
                DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant ELSE 0 END), 0) as total_cdf'),
                DB::raw('COUNT(*) as nb_paiements')
            )
            ->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'agence' => [
                    'id'   => $agence->id,
                    'code' => $agence->code,
                    'nom'  => $agence->nom,
                    'type' => $agence->type_agence,
                ],
                'colis_par_statut' => $colisParStatut,
                'paiements_30j'    => [
                    'total_usd'    => (float) $paiements30j->total_usd,
                    'total_cdf'    => (float) $paiements30j->total_cdf,
                    'nb_paiements' => (int) $paiements30j->nb_paiements,
                ],
            ],
        ]);
    }

    /**
     * GET /api/provinces
     */
    public function provinces()
    {
        $provinces = Province::where('actif', true)
            ->withCount('villes')
            ->withCount('agences')
            ->orderBy('nom')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $provinces,
        ]);
    }

    /**
     * GET /api/villes
     *
     * Query params :
     *   - province_id : filtre par province
     */
    public function villes(Request $request)
    {
        $query = Ville::with('province:id,code,nom')->where('actif', true);

        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }

        $villes = $query->orderBy('nom')->get();

        return response()->json([
            'success' => true,
            'data'    => $villes,
        ]);
    }

    /**
     * GET /api/communes
     *
     * Query params :
     *   - ville_id : filtre par ville
     */
    public function communes(Request $request)
    {
        $query = Commune::with('ville:id,nom,province_id')->where('actif', true);

        if ($request->filled('ville_id')) {
            $query->where('ville_id', $request->ville_id);
        }

        $communes = $query->orderBy('nom')->get();

        return response()->json([
            'success' => true,
            'data'    => $communes,
        ]);
    }
}