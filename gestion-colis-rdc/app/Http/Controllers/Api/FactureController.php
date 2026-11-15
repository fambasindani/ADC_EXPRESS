<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\Facture;
use App\Models\Sequence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class FactureController extends Controller
{
    /**
     * GET /api/factures
     *
     * Query params :
     *   - search        : recherche (numero_facture, numéro suivi colis, nom expéditeur)
     *   - statut        : BROUILLON | EN_ATTENTE | PARTIELLE | PAYEE | ANNULEE | REMBOURSEE
     *   - devise_code   : CDF | USD
     *   - date_start    : date_facture >= Y-m-d
     *   - date_end      : date_facture <= Y-m-d
     *   - sort_by       : date_facture | montant_total | numero_facture (défaut: date_facture)
     *   - sort_dir      : asc | desc (défaut: desc)
     *   - per_page      : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $query = Facture::with([
            'colis:id,numero_suivi,nom_expediteur,nom_destinataire,montant_transport',
            'devise:code,symbole',
            'createur:id,nom,prenom',
        ]);

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('numero_facture', 'like', "%{$s}%")
                  ->orWhereHas('colis', fn($c) => $c
                      ->where('numero_suivi', 'like', "%{$s}%")
                      ->orWhere('nom_expediteur', 'like', "%{$s}%")
                      ->orWhere('nom_destinataire', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut') && in_array($request->statut, ['BROUILLON', 'EN_ATTENTE', 'PARTIELLE', 'PAYEE', 'ANNULEE', 'REMBOURSEE'])) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('devise_code')) {
            $query->where('devise_code', $request->devise_code);
        }
        if ($request->filled('date_start')) {
            $query->whereDate('date_facture', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_facture', '<=', $request->date_end);
        }

        // 📊 Tri
        $allowedSorts = ['date_facture', 'montant_total', 'numero_facture'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_facture';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage  = min(max((int) $request->get('per_page', 15), 5), 100);
        $factures = $query->paginate($perPage);

        // Enrichir avec montants payés / solde
        $factures->getCollection()->transform(function ($facture) {
            $facture->montant_paye = (float) $facture->paiements()
                ->where('statut', 'VALIDE')
                ->sum('montant');
            $facture->solde = round((float) $facture->montant_total - $facture->montant_paye, 2);
            $facture->est_payee = $facture->solde <= 0.01;
            return $facture;
        });

        return response()->json([
            'success' => true,
            'data'    => $factures->items(),
            'meta'    => [
                'current_page' => $factures->currentPage(),
                'per_page'     => $factures->perPage(),
                'total'        => $factures->total(),
                'last_page'    => $factures->lastPage(),
                'from'         => $factures->firstItem(),
                'to'           => $factures->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/factures
     * Crée une facture pour un colis.
     * Normalement, la facture est créée automatiquement avec le colis,
     * mais cette route permet une création manuelle (cas exceptionnel).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'       => 'required|exists:colis,id',
            'montant_total'  => 'required|numeric|min:0',
            'devise_code'    => 'required|exists:devises,code',
            'statut'         => ['nullable', Rule::in(['BROUILLON', 'EN_ATTENTE', 'PARTIELLE', 'PAYEE', 'ANNULEE', 'REMBOURSEE'])],
            'date_facture'   => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Un colis ne peut avoir qu'une seule facture (contrainte UNIQUE)
        if (Facture::where('colis_id', $request->colis_id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Une facture existe déjà pour ce colis.',
            ], 409);
        }

        try {
            $facture = Facture::create([
                'numero_facture' => Sequence::next('facture'),
                'colis_id'       => $request->colis_id,
                'montant_total'  => $request->montant_total,
                'devise_code'    => $request->devise_code,
                'date_facture'   => $request->input('date_facture', now()),
                'statut'         => $request->input('statut', 'EN_ATTENTE'),
                'cree_par'       => $request->user()->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Facture créée avec succès.',
                'data'    => $facture->load('colis', 'devise', 'createur'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/factures/{id}
     */
    public function show($id)
    {
        $facture = Facture::with([
            'colis.agenceDepot:id,code,nom',
            'colis.agenceDestination:id,code,nom',
            'colis.villeDestination:id,nom',
            'colis.typeColis:id,code,libelle',
            'colis.service:id,code,libelle',
            'colis.clientExpediteur',
            'devise:code,nom,symbole',
            'createur:id,nom,prenom',
            'paiements.modePaiement:id,code,libelle',
            'paiements.encaissePar:id,nom,prenom',
        ])->findOrFail($id);

        $montantPaye = (float) $facture->paiements()->where('statut', 'VALIDE')->sum('montant');
        $solde = round((float) $facture->montant_total - $montantPaye, 2);

        return response()->json([
            'success' => true,
            'data'    => [
                'facture'      => $facture,
                'montant_paye' => $montantPaye,
                'solde'        => $solde,
                'est_payee'    => $solde <= 0.01,
            ],
        ]);
    }

    /**
     * PUT /api/factures/{id}
     */
    public function update(Request $request, $id)
    {
        $facture = Facture::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'montant_total' => 'sometimes|required|numeric|min:0',
            'devise_code'   => 'sometimes|required|exists:devises,code',
            'statut'        => ['nullable', Rule::in(['BROUILLON', 'EN_ATTENTE', 'PARTIELLE', 'PAYEE', 'ANNULEE', 'REMBOURSEE'])],
            'date_facture'  => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        // Si on modifie le montant, vérifier qu'il reste ≥ montant déjà payé
        if ($request->filled('montant_total')) {
            $dejaPaye = (float) $facture->paiements()->where('statut', 'VALIDE')->sum('montant');
            if ($request->montant_total < $dejaPaye) {
                return response()->json([
                    'success' => false,
                    'message' => "Le nouveau montant ne peut pas être inférieur au montant déjà payé ({$dejaPaye}).",
                ], 422);
            }
        }

        $facture->update($request->only(['montant_total', 'devise_code', 'statut', 'date_facture']));

        return response()->json([
            'success' => true,
            'message' => 'Facture mise à jour.',
            'data'    => $facture->fresh()->load('colis', 'devise'),
        ]);
    }

    /**
     * DELETE /api/factures/{id}
     * Refuse si des paiements valides y sont rattachés.
     */
    public function destroy($id)
    {
        $facture = Facture::findOrFail($id);

        if ($facture->paiements()->where('statut', 'VALIDE')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette facture a des paiements validés.',
            ], 409);
        }

        DB::transaction(function () use ($facture) {
            $facture->paiements()->delete();
            $facture->delete();
        });

        return response()->json(['success' => true, 'message' => 'Facture supprimée.']);
    }

    /**
     * GET /api/factures/{id}/paiements
     */
    public function paiements(Request $request, $id)
    {
        $facture = Facture::findOrFail($id);
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);

        $paiements = $facture->paiements()
            ->with(['modePaiement', 'encaissePar:id,nom,prenom', 'agence:id,code,nom'])
            ->orderByDesc('date_paiement')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $paiements->items(),
            'meta'    => [
                'current_page' => $paiements->currentPage(),
                'per_page'     => $paiements->perPage(),
                'total'        => $paiements->total(),
                'last_page'    => $paiements->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/factures/{id}/recalculer
     * Recalcule le statut de la facture à partir des paiements validés.
     */
    public function recalculerStatut($id)
    {
        $facture = Facture::findOrFail($id);

        $montantPaye = (float) $facture->paiements()->where('statut', 'VALIDE')->sum('montant');
        $solde = round((float) $facture->montant_total - $montantPaye, 2);

        if ($solde <= 0.01) {
            $nouveauStatut = 'PAYEE';
        } elseif ($montantPaye > 0) {
            $nouveauStatut = 'PARTIELLE';
        } else {
            $nouveauStatut = 'EN_ATTENTE';
        }

        $facture->update(['statut' => $nouveauStatut]);

        return response()->json([
            'success' => true,
            'message' => "Statut recalculé : {$nouveauStatut}",
            'data'    => [
                'facture'      => $facture->fresh(),
                'montant_paye' => $montantPaye,
                'solde'        => $solde,
            ],
        ]);
    }

    /**
     * GET /api/factures/stats
     * Statistiques globales des factures.
     */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = Facture::query();

        // Restriction par agence (via colis)
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->whereHas('colis', fn($q) => $q
                ->where('agence_depot_id', $user->agence_id)
                ->orWhere('agence_destination_id', $user->agence_id));
        }

        $parStatut = (clone $query)
            ->select('statut', DB::raw('COUNT(*) as total'), DB::raw('SUM(montant_total) as montant'))
            ->groupBy('statut')
            ->get();

        $totaux = (clone $query)->select(
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant_total ELSE 0 END), 0) as total_usd'),
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant_total ELSE 0 END), 0) as total_cdf'),
            DB::raw('COUNT(*) as nb_factures')
        )->first();

        return response()->json([
            'success' => true,
            'data'    => [
                'par_statut' => $parStatut,
                'totaux'     => [
                    'total_usd'    => (float) $totaux->total_usd,
                    'total_cdf'    => (float) $totaux->total_cdf,
                    'nb_factures'  => (int) $totaux->nb_factures,
                ],
            ],
        ]);
    }

    /**
     * GET /api/factures/par-colis/{colisId}
     * Retourne la facture d'un colis (unique).
     */
    public function parColis($colisId)
    {
        $colis = Colis::findOrFail($colisId);
        $facture = Facture::with(['devise', 'paiements'])
            ->where('colis_id', $colis->id)
            ->first();

        if (! $facture) {
            return response()->json([
                'success' => false,
                'message' => 'Aucune facture pour ce colis.',
            ], 404);
        }

        $montantPaye = (float) $facture->paiements()->where('statut', 'VALIDE')->sum('montant');

        return response()->json([
            'success' => true,
            'data'    => [
                'facture'      => $facture,
                'montant_paye' => $montantPaye,
                'solde'        => round((float) $facture->montant_total - $montantPaye, 2),
            ],
        ]);
    }
}