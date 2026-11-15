<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Caisse;
use App\Models\Devise;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CaisseController extends Controller
{
    /**
     * GET /api/caisses
     *
     * Query params :
     *   - search       : recherche (code, libelle, agence)
     *   - agence_id    : filtre par agence
     *   - devise_code  : CDF | USD
     *   - actif        : true | false
     *   - sort_by      : code | libelle | solde_initial | created_at (défaut: code)
     *   - sort_dir     : asc | desc
     *   - per_page     : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $query = Caisse::with([
            'agence:id,code,nom,type_agence',
            'devise:code,nom,symbole',
        ]);

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('libelle', 'like', "%{$s}%")
                  ->orWhereHas('agence', fn($a) => $a
                      ->where('code', 'like', "%{$s}%")
                      ->orWhere('nom', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('agence_id')) {
            $query->where('agence_id', $request->agence_id);
        }
        if ($request->filled('devise_code')) {
            $query->where('devise_code', $request->devise_code);
        }
        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        // 📊 Tri
        $allowedSorts = ['code', 'libelle', 'solde_initial', 'created_at'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'code';
        $sortDir = $request->get('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $caisses = $query->paginate($perPage);

        // Enrichir chaque caisse avec le solde actuel
        $caisses->getCollection()->transform(function ($caisse) {
            $caisse->solde_actuel = $this->calculerSoldeActuel($caisse);
            return $caisse;
        });

        return response()->json([
            'success' => true,
            'data'    => $caisses->items(),
            'meta'    => [
                'current_page' => $caisses->currentPage(),
                'per_page'     => $caisses->perPage(),
                'total'        => $caisses->total(),
                'last_page'    => $caisses->lastPage(),
                'from'         => $caisses->firstItem(),
                'to'           => $caisses->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/caisses
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'agence_id'     => 'required|exists:agences,id',
            'code'          => [
                'required', 'string', 'max:30',
                Rule::unique('caisses')->where(fn($q) => $q->where('agence_id', $request->agence_id)),
            ],
            'libelle'       => 'required|string|max:100',
            'devise_code'   => 'required|exists:devises,code',
            'solde_initial' => 'nullable|numeric|min:0',
            'actif'         => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $caisse = Caisse::create([
                'agence_id'     => $request->agence_id,
                'code'          => strtoupper($request->code),
                'libelle'       => $request->libelle,
                'devise_code'   => $request->devise_code,
                'solde_initial' => $request->input('solde_initial', 0),
                'actif'         => $request->input('actif', true),
            ]);

            $caisse->solde_actuel = $this->calculerSoldeActuel($caisse);

            return response()->json([
                'success' => true,
                'message' => 'Caisse créée avec succès.',
                'data'    => $caisse->load('agence', 'devise'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/caisses/{id}
     */
    public function show($id)
    {
        $caisse = Caisse::with([
            'agence:id,code,nom,type_agence',
            'devise:code,nom,symbole',
        ])->findOrFail($id);

        $caisse->solde_actuel = $this->calculerSoldeActuel($caisse);

        // Statistiques
        $stats = [
            'total_paiements' => $caisse->paiements()->where('statut', 'VALIDE')->count(),
            'total_encaissements' => (float) $caisse->paiements()
                ->where('statut', 'VALIDE')
                ->sum('montant'),
            'paiements_du_jour' => (float) $caisse->paiements()
                ->where('statut', 'VALIDE')
                ->whereDate('date_paiement', now()->toDateString())
                ->sum('montant'),
        ];

        return response()->json([
            'success' => true,
            'data'    => [
                'caisse' => $caisse,
                'stats'  => $stats,
            ],
        ]);
    }

    /**
     * PUT /api/caisses/{id}
     */
    public function update(Request $request, $id)
    {
        $caisse = Caisse::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'agence_id'     => 'sometimes|required|exists:agences,id',
            'code'          => [
                'sometimes', 'required', 'string', 'max:30',
                Rule::unique('caisses')
                    ->where(fn($q) => $q->where('agence_id', $request->input('agence_id', $caisse->agence_id)))
                    ->ignore($caisse->id),
            ],
            'libelle'       => 'sometimes|required|string|max:100',
            'devise_code'   => 'sometimes|required|exists:devises,code',
            'solde_initial' => 'nullable|numeric|min:0',
            'actif'         => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['agence_id', 'code', 'libelle', 'devise_code', 'solde_initial', 'actif']);
        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);

        $caisse->update($data);
        $caisse->solde_actuel = $this->calculerSoldeActuel($caisse->fresh());

        return response()->json([
            'success' => true,
            'message' => 'Caisse mise à jour.',
            'data'    => $caisse->fresh()->load('agence', 'devise'),
        ]);
    }

    /**
     * DELETE /api/caisses/{id}
     * Refuse si des paiements y sont rattachés.
     */
    public function destroy($id)
    {
        $caisse = Caisse::findOrFail($id);

        if ($caisse->paiements()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette caisse a des paiements rattachés.',
            ], 409);
        }

        $caisse->delete();

        return response()->json(['success' => true, 'message' => 'Caisse supprimée.']);
    }

    /**
     * GET /api/caisses/form-data
     */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'agences' => Agence::where('actif', true)
                                ->orderBy('nom')
                                ->get(['id', 'code', 'nom', 'type_agence']),
                'devises' => Devise::where('actif', true)
                                ->orderBy('code')
                                ->get(['code', 'nom', 'symbole']),
            ],
        ]);
    }

    /**
     * GET /api/caisses/{id}/mouvements
     * Liste des paiements de la caisse (avec pagination).
     */
    public function mouvements(Request $request, $id)
    {
        $caisse = Caisse::findOrFail($id);
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);

        $mouvements = $caisse->paiements()
            ->with(['colis:id,numero_suivi,nom_expediteur', 'modePaiement', 'encaissePar:id,nom,prenom'])
            ->orderByDesc('date_paiement')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $mouvements->items(),
            'meta'    => [
                'current_page' => $mouvements->currentPage(),
                'per_page'     => $mouvements->perPage(),
                'total'        => $mouvements->total(),
                'last_page'    => $mouvements->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/caisses/{id}/solde
     * Retourne le solde actuel de la caisse.
     */
    public function solde($id)
    {
        $caisse = Caisse::with('devise:code,symbole')->findOrFail($id);

        $encaissements = (float) $caisse->paiements()
            ->where('statut', 'VALIDE')
            ->sum('montant');

        $remboursements = (float) DB::table('remboursements')
            ->join('paiements', 'remboursements.paiement_id', '=', 'paiements.id')
            ->where('paiements.caisse_id', $caisse->id)
            ->where('remboursements.statut', 'EFFECTUE')
            ->sum('remboursements.montant');

        $soldeActuel = (float) $caisse->solde_initial + $encaissements - $remboursements;

        return response()->json([
            'success' => true,
            'data'    => [
                'caisse_id'      => $caisse->id,
                'code'           => $caisse->code,
                'libelle'        => $caisse->libelle,
                'devise'         => $caisse->devise_code,
                'symbole'        => $caisse->devise->symbole ?? '',
                'solde_initial'  => (float) $caisse->solde_initial,
                'encaissements'  => $encaissements,
                'remboursements' => $remboursements,
                'solde_actuel'   => round($soldeActuel, 2),
            ],
        ]);
    }

    /**
     * Calcule le solde actuel d'une caisse.
     */
    private function calculerSoldeActuel(Caisse $caisse): float
    {
        $encaissements = (float) $caisse->paiements()
            ->where('statut', 'VALIDE')
            ->sum('montant');

        $remboursements = (float) DB::table('remboursements')
            ->join('paiements', 'remboursements.paiement_id', '=', 'paiements.id')
            ->where('paiements.caisse_id', $caisse->id)
            ->where('remboursements.statut', 'EFFECTUE')
            ->sum('remboursements.montant');

        return round((float) $caisse->solde_initial + $encaissements - $remboursements, 2);
    }
}