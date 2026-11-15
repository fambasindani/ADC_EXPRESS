<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Devise;
use App\Models\ServiceTransport;
use App\Models\Tarif;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class TarifController extends Controller
{
    /**
     * GET /api/tarifs
     *
     * Query params :
     *   - search                  : recherche (agence origine/destination, service)
     *   - agence_origine_id       : filtre
     *   - agence_destination_id   : filtre
     *   - service_id              : filtre
     *   - devise_code             : CDF | USD
     *   - actif                   : true | false
     *   - date                    : tarifs valides à cette date (Y-m-d)
     *   - sort_by                 : created_at | date_debut | prix_base (défaut: date_debut)
     *   - sort_dir                : asc | desc (défaut: desc)
     *   - per_page                : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $query = Tarif::with([
            'agenceOrigine:id,code,nom',
            'agenceDestination:id,code,nom',
            'service:id,code,libelle',
            'devise:code,nom,symbole',
        ]);

        // 🔍 Recherche par code/nom d'agence ou service
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->whereHas('agenceOrigine', fn($a) => $a->where('code', 'like', "%{$s}%")->orWhere('nom', 'like', "%{$s}%"))
                  ->orWhereHas('agenceDestination', fn($a) => $a->where('code', 'like', "%{$s}%")->orWhere('nom', 'like', "%{$s}%"))
                  ->orWhereHas('service', fn($a) => $a->where('code', 'like', "%{$s}%")->orWhere('libelle', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('agence_origine_id')) {
            $query->where('agence_origine_id', $request->agence_origine_id);
        }
        if ($request->filled('agence_destination_id')) {
            $query->where('agence_destination_id', $request->agence_destination_id);
        }
        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }
        if ($request->filled('devise_code')) {
            $query->where('devise_code', $request->devise_code);
        }
        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('date')) {
            $date = $request->date;
            $query->where('date_debut', '<=', $date)
                  ->where(fn($q) => $q->whereNull('date_fin')->orWhere('date_fin', '>=', $date));
        }

        // 📊 Tri
        $allowedSorts = ['date_debut', 'prix_base', 'created_at'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_debut';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $tarifs  = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $tarifs->items(),
            'meta'    => [
                'current_page' => $tarifs->currentPage(),
                'per_page'     => $tarifs->perPage(),
                'total'        => $tarifs->total(),
                'last_page'    => $tarifs->lastPage(),
                'from'         => $tarifs->firstItem(),
                'to'           => $tarifs->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/tarifs
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'agence_origine_id'     => 'nullable|exists:agences,id',
            'agence_destination_id' => 'nullable|exists:agences,id',
            'service_id'            => 'required|exists:services_transport,id',
            'devise_code'           => 'required|exists:devises,code',
            'prix_base'             => 'required|numeric|min:0',
            'prix_kg'               => 'required|numeric|min:0',
            'frais_supplementaires' => 'nullable|numeric|min:0',
            'poids_min'             => 'nullable|numeric|min:0',
            'poids_max'             => 'nullable|numeric|gt:poids_min',
            'date_debut'            => 'required|date',
            'date_fin'              => 'nullable|date|after_or_equal:date_debut',
            'actif'                 => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Vérifier l'unicité métier (route + service + devise + date_debut)
        $exists = Tarif::where('agence_origine_id', $request->agence_origine_id)
            ->where('agence_destination_id', $request->agence_destination_id)
            ->where('service_id', $request->service_id)
            ->where('devise_code', $request->devise_code)
            ->where('date_debut', $request->date_debut)
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Un tarif existe déjà pour cette combinaison (route + service + devise + date).',
            ], 409);
        }

        try {
            $tarif = Tarif::create([
                'agence_origine_id'     => $request->agence_origine_id,
                'agence_destination_id' => $request->agence_destination_id,
                'service_id'            => $request->service_id,
                'devise_code'           => $request->devise_code,
                'prix_base'             => $request->prix_base,
                'prix_kg'               => $request->prix_kg,
                'frais_supplementaires' => $request->input('frais_supplementaires', 0),
                'poids_min'             => $request->input('poids_min', 0),
                'poids_max'             => $request->poids_max,
                'date_debut'            => $request->date_debut,
                'date_fin'              => $request->date_fin,
                'actif'                 => $request->input('actif', true),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Tarif créé avec succès.',
                'data'    => $tarif->load('agenceOrigine', 'agenceDestination', 'service', 'devise'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/tarifs/{id}
     */
    public function show($id)
    {
        $tarif = Tarif::with([
            'agenceOrigine:id,code,nom,type_agence',
            'agenceDestination:id,code,nom,type_agence',
            'service:id,code,libelle,delai_indicatif_jours',
            'devise:code,nom,symbole',
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $tarif]);
    }

    /**
     * PUT /api/tarifs/{id}
     */
    public function update(Request $request, $id)
    {
        $tarif = Tarif::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'agence_origine_id'     => 'nullable|exists:agences,id',
            'agence_destination_id' => 'nullable|exists:agences,id',
            'service_id'            => 'sometimes|required|exists:services_transport,id',
            'devise_code'           => 'sometimes|required|exists:devises,code',
            'prix_base'             => 'sometimes|required|numeric|min:0',
            'prix_kg'               => 'sometimes|required|numeric|min:0',
            'frais_supplementaires' => 'nullable|numeric|min:0',
            'poids_min'             => 'nullable|numeric|min:0',
            'poids_max'             => 'nullable|numeric',
            'date_debut'            => 'sometimes|required|date',
            'date_fin'              => 'nullable|date',
            'actif'                 => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Vérification poids_max > poids_min
        $newPoidsMin = $request->input('poids_min', $tarif->poids_min);
        $newPoidsMax = $request->has('poids_max') ? $request->poids_max : $tarif->poids_max;
        if ($newPoidsMax !== null && $newPoidsMax <= $newPoidsMin) {
            return response()->json([
                'success' => false,
                'message' => 'Le poids maximum doit être supérieur au poids minimum.',
            ], 422);
        }

        $tarif->update($request->only([
            'agence_origine_id', 'agence_destination_id', 'service_id',
            'devise_code', 'prix_base', 'prix_kg', 'frais_supplementaires',
            'poids_min', 'poids_max', 'date_debut', 'date_fin', 'actif',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Tarif mis à jour.',
            'data'    => $tarif->fresh()->load('agenceOrigine', 'agenceDestination', 'service', 'devise'),
        ]);
    }

    /**
     * DELETE /api/tarifs/{id}
     */
    public function destroy($id)
    {
        $tarif = Tarif::findOrFail($id);
        $tarif->delete();

        return response()->json(['success' => true, 'message' => 'Tarif supprimé.']);
    }

    /**
     * POST /api/tarifs/calculer
     *
     * Calcule le prix pour un colis donné selon les règles de tarification.
     * Body :
     *   - agence_origine_id     : nullable (si null, tarif "global")
     *   - agence_destination_id : nullable
     *   - service_id            : required
     *   - poids_kg              : required
     *   - devise_code           : nullable (défaut : devise du tarif trouvé)
     */
    public function calculer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'agence_origine_id'     => 'nullable|exists:agences,id',
            'agence_destination_id' => 'nullable|exists:agences,id',
            'service_id'            => 'required|exists:services_transport,id',
            'poids_kg'              => 'required|numeric|min:0.01',
            'devise_code'           => 'nullable|exists:devises,code',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $query = Tarif::where('service_id', $request->service_id)
            ->where('actif', true)
            ->where('date_debut', '<=', now()->toDateString())
            ->where(fn($q) => $q->whereNull('date_fin')->orWhere('date_fin', '>=', now()->toDateString()))
            ->where('poids_min', '<=', $request->poids_kg)
            ->where(fn($q) => $q->whereNull('poids_max')->orWhere('poids_max', '>=', $request->poids_kg));

        // Filtre par agence (priorité aux tarifs spécifiques)
        if ($request->filled('agence_origine_id')) {
            $query->where(fn($q) => $q
                ->where('agence_origine_id', $request->agence_origine_id)
                ->orWhereNull('agence_origine_id'));
        }
        if ($request->filled('agence_destination_id')) {
            $query->where(fn($q) => $q
                ->where('agence_destination_id', $request->agence_destination_id)
                ->orWhereNull('agence_destination_id'));
        }
        if ($request->filled('devise_code')) {
            $query->where('devise_code', $request->devise_code);
        }

        // Priorité : tarif le plus spécifique (avec agence) avant tarif global
        $tarif = $query->orderByRaw('(agence_origine_id IS NOT NULL) DESC')
                       ->orderByRaw('(agence_destination_id IS NOT NULL) DESC')
                       ->orderByDesc('date_debut')
                       ->first();

        if (!$tarif) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun tarif trouvé pour ces critères.',
            ], 404);
        }

        $prixKg   = (float) $tarif->prix_kg * (float) $request->poids_kg;
        $prixBase = (float) $tarif->prix_base;
        $frais    = (float) $tarif->frais_supplementaires;
        $total    = $prixBase + $prixKg + $frais;

        return response()->json([
            'success' => true,
            'data'    => [
                'tarif'          => $tarif->load('service'),
                'poids_kg'       => (float) $request->poids_kg,
                'prix_base'      => $prixBase,
                'prix_kg'        => (float) $tarif->prix_kg,
                'frais_supplementaires' => $frais,
                'total'          => round($total, 2),
                'devise'         => $tarif->devise_code,
                'detail'         => "{$prixBase} + ({$request->poids_kg}kg × {$tarif->prix_kg}) + {$frais} = {$total} {$tarif->devise_code}",
            ],
        ]);
    }

    /**
     * GET /api/tarifs/form-data
     * Alimente le formulaire de création/modification.
     */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'agences'  => Agence::where('actif', true)
                                ->orderBy('nom')
                                ->get(['id', 'code', 'nom', 'type_agence']),
                'services' => ServiceTransport::where('actif', true)
                                ->orderBy('libelle')
                                ->get(['id', 'code', 'libelle', 'delai_indicatif_jours']),
                'devises'  => Devise::where('actif', true)
                                ->orderBy('code')
                                ->get(['code', 'nom', 'symbole']),
            ],
        ]);
    }

    /**
     * GET /api/tarifs/route/{agenceOrigineId}/{agenceDestinationId}
     * Retourne tous les tarifs pour une route donnée (tous services confondus).
     */
    public function byRoute($agenceOrigineId, $agenceDestinationId)
    {
        $tarifs = Tarif::with(['service:id,code,libelle,delai_indicatif_jours', 'devise:code,symbole'])
            ->where(fn($q) => $q
                ->where(fn($sub) => $sub
                    ->where('agence_origine_id', $agenceOrigineId)
                    ->where('agence_destination_id', $agenceDestinationId))
                ->orWhere(fn($sub) => $sub
                    ->whereNull('agence_origine_id')
                    ->whereNull('agence_destination_id')))
            ->where('actif', true)
            ->where('date_debut', '<=', now()->toDateString())
            ->where(fn($q) => $q->whereNull('date_fin')->orWhere('date_fin', '>=', now()->toDateString()))
            ->orderBy('service_id')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $tarifs,
        ]);
    }
}