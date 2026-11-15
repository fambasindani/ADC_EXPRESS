<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\Remboursement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RemboursementController extends Controller
{
    /**
     * GET /api/remboursements
     *
     * Query params :
     *   - search        : recherche (motif, payeur, référence paiement)
     *   - statut        : DEMANDE | VALIDE | REJETE | EFFECTUE
     *   - paiement_id   : filtre par paiement
     *   - date_start    : date_remboursement >= Y-m-d
     *   - date_end      : date_remboursement <= Y-m-d
     *   - sort_by       : date_remboursement | montant (défaut: date_remboursement)
     *   - sort_dir      : asc | desc (défaut: desc)
     *   - per_page      : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Remboursement::with([
            'paiement.colis:id,numero_suivi,nom_expediteur',
            'paiement.modePaiement:id,code,libelle',
            'paiement.caisse:id,code,libelle',
            'remboursePar:id,nom,prenom',
        ]);

        // 🔒 Restriction par agence (via paiement)
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->whereHas('paiement', fn($q) => $q->where('agence_id', $user->agence_id));
        }

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('motif', 'like', "%{$s}%")
                  ->orWhereHas('paiement', fn($p) => $p
                      ->where('reference_paiement', 'like', "%{$s}%")
                      ->orWhere('payeur_nom', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut') && in_array($request->statut, ['DEMANDE', 'VALIDE', 'REJETE', 'EFFECTUE'])) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('paiement_id')) {
            $query->where('paiement_id', $request->paiement_id);
        }
        if ($request->filled('date_start')) {
            $query->whereDate('date_remboursement', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_remboursement', '<=', $request->date_end);
        }

        // 📊 Tri
        $allowedSorts = ['date_remboursement', 'montant'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_remboursement';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage      = min(max((int) $request->get('per_page', 15), 5), 100);
        $remboursements = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $remboursements->items(),
            'meta'    => [
                'current_page' => $remboursements->currentPage(),
                'per_page'     => $remboursements->perPage(),
                'total'        => $remboursements->total(),
                'last_page'    => $remboursements->lastPage(),
                'from'         => $remboursements->firstItem(),
                'to'           => $remboursements->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/remboursements
     * Crée une demande de remboursement (statut DEMANDE par défaut).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'paiement_id' => 'required|exists:paiements,id',
            'montant'     => 'required|numeric|min:0.01',
            'motif'       => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $remboursement = DB::transaction(function () use ($request) {
                $user     = $request->user();
                $paiement = Paiement::lockForUpdate()->findOrFail($request->paiement_id);

                // 🔒 Vérifier que le paiement est VALIDE
                if ($paiement->statut !== 'VALIDE') {
                    throw new \Exception('Seuls les paiements VALIDE peuvent être remboursés.');
                }

                // 🔒 Vérifier que le montant ne dépasse pas le montant initial du paiement
                $dejaRembourse = (float) Remboursement::where('paiement_id', $paiement->id)
                    ->whereIn('statut', ['VALIDE', 'EFFECTUE'])
                    ->sum('montant');

                $remboursable = round((float) $paiement->montant - $dejaRembourse, 2);

                if ($request->montant > $remboursable + 0.01) {
                    throw new \Exception("Le montant ({$request->montant}) dépasse le montant remboursable restant ({$remboursable} {$paiement->devise_code}).");
                }

                return Remboursement::create([
                    'paiement_id'          => $paiement->id,
                    'montant'              => $request->montant,
                    'motif'                => $request->motif,
                    'rembourse_par'        => $user->id,
                    'date_remboursement'   => now(),
                    'statut'               => 'DEMANDE',
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Demande de remboursement enregistrée.',
                'data'    => $remboursement->load('paiement', 'remboursePar'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/remboursements/{id}
     */
    public function show($id)
    {
        $remboursement = Remboursement::with([
            'paiement.colis:id,numero_suivi,nom_expediteur,nom_destinataire',
            'paiement.facture:id,numero_facture,montant_total,statut',
            'paiement.modePaiement',
            'paiement.caisse:id,code,libelle',
            'paiement.encaissePar:id,nom,prenom',
            'remboursePar:id,nom,prenom',
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $remboursement]);
    }

    /**
     * PUT /api/remboursements/{id}
     * Modifie une demande encore en statut DEMANDE.
     */
    public function update(Request $request, $id)
    {
        $remboursement = Remboursement::findOrFail($id);

        if ($remboursement->statut !== 'DEMANDE') {
            return response()->json([
                'success' => false,
                'message' => 'Seules les demandes en statut DEMANDE peuvent être modifiées.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'montant' => 'sometimes|required|numeric|min:0.01',
            'motif'   => 'sometimes|required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        if ($request->filled('montant')) {
            $dejaRembourse = (float) Remboursement::where('paiement_id', $remboursement->paiement_id)
                ->whereIn('statut', ['VALIDE', 'EFFECTUE'])
                ->where('id', '!=', $remboursement->id)
                ->sum('montant');

            $remboursable = round((float) $remboursement->paiement->montant - $dejaRembourse, 2);

            if ($request->montant > $remboursable + 0.01) {
                return response()->json([
                    'success' => false,
                    'message' => "Le montant dépasse le montant remboursable restant ({$remboursable}).",
                ], 422);
            }
        }

        $remboursement->update($request->only(['montant', 'motif']));

        return response()->json([
            'success' => true,
            'message' => 'Remboursement mis à jour.',
            'data'    => $remboursement->fresh()->load('paiement'),
        ]);
    }

    /**
     * DELETE /api/remboursements/{id}
     * Supprime une demande non encore traitée.
     */
    public function destroy($id)
    {
        $remboursement = Remboursement::findOrFail($id);

        if (! in_array($remboursement->statut, ['DEMANDE', 'REJETE'])) {
            return response()->json([
                'success' => false,
                'message' => 'Seules les demandes en statut DEMANDE ou REJETE peuvent être supprimées.',
            ], 422);
        }

        $remboursement->delete();

        return response()->json(['success' => true, 'message' => 'Remboursement supprimé.']);
    }

    /**
     * POST /api/remboursements/{id}/valider
     * Passe le statut DEMANDE → VALIDE (validation par superviseur).
     */
    public function valider($id)
    {
        $remboursement = Remboursement::findOrFail($id);

        if ($remboursement->statut !== 'DEMANDE') {
            return response()->json([
                'success' => false,
                'message' => 'Seules les demandes en statut DEMANDE peuvent être validées.',
            ], 422);
        }

        $remboursement->update(['statut' => 'VALIDE']);

        return response()->json([
            'success' => true,
            'message' => 'Remboursement validé.',
            'data'    => $remboursement->fresh()->load('paiement', 'remboursePar'),
        ]);
    }

    /**
     * POST /api/remboursements/{id}/rejeter
     * Passe le statut DEMANDE → REJETE.
     */
    public function rejeter(Request $request, $id)
    {
        $remboursement = Remboursement::findOrFail($id);

        if ($remboursement->statut !== 'DEMANDE') {
            return response()->json([
                'success' => false,
                'message' => 'Seules les demandes en statut DEMANDE peuvent être rejetées.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'motif_rejet' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $motif = $remboursement->motif;
        if ($request->filled('motif_rejet')) {
            $motif .= ' | Rejeté : ' . $request->motif_rejet;
        }

        $remboursement->update(['statut' => 'REJETE', 'motif' => $motif]);

        return response()->json([
            'success' => true,
            'message' => 'Remboursement rejeté.',
            'data'    => $remboursement->fresh(),
        ]);
    }

    /**
     * POST /api/remboursements/{id}/effectuer
     * Passe le statut VALIDE → EFFECTUE + impact caisse + facture.
     */
    public function effectuer($id)
    {
        $remboursement = Remboursement::findOrFail($id);

        if ($remboursement->statut !== 'VALIDE') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les remboursements VALIDE peuvent être effectués.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($remboursement) {
                $paiement = $remboursement->paiement;
                $facture  = $paiement->facture;

                // Marquer EFFECTUE
                $remboursement->update(['statut' => 'EFFECTUE']);

                // Mettre à jour le paiement d'origine → REMBOURSE si totalement remboursé
                $totalRembourse = (float) Remboursement::where('paiement_id', $paiement->id)
                    ->where('statut', 'EFFECTUE')
                    ->sum('montant');

                if ($totalRembourse >= (float) $paiement->montant - 0.01) {
                    $paiement->update(['statut' => 'REMBOURSE']);
                }

                // Recalculer statut facture
                $montantPayeValide = (float) $facture->paiements()
                    ->where('statut', 'VALIDE')
                    ->sum('montant');

                if ($montantPayeValide <= 0.01) {
                    $facture->update(['statut' => 'REMBOURSEE']);
                } elseif ($montantPayeValide >= (float) $facture->montant_total - 0.01) {
                    $facture->update(['statut' => 'PAYEE']);
                } else {
                    $facture->update(['statut' => 'PARTIELLE']);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Remboursement effectué. Caisse et facture mises à jour.',
                'data'    => $remboursement->fresh()->load('paiement', 'remboursePar'),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/remboursements/par-paiement/{paiementId}
     */
    public function parPaiement($paiementId)
    {
        $paiement = Paiement::findOrFail($paiementId);

        $remboursements = $paiement->remboursements()
            ->with('remboursePar:id,nom,prenom')
            ->orderByDesc('date_remboursement')
            ->get();

        $totalRembourse = $remboursements->whereIn('statut', ['VALIDE', 'EFFECTUE'])->sum('montant');
        $remboursable   = round((float) $paiement->montant - $totalRembourse, 2);

        return response()->json([
            'success' => true,
            'data'    => [
                'paiement'       => $paiement,
                'remboursements' => $remboursements,
                'montant_initial' => (float) $paiement->montant,
                'total_rembourse' => (float) $totalRembourse,
                'remboursable'    => $remboursable,
            ],
        ]);
    }

    /**
     * GET /api/remboursements/stats
     */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = Remboursement::query();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->whereHas('paiement', fn($q) => $q->where('agence_id', $user->agence_id));
        }

        if ($request->filled('date_start')) {
            $query->whereDate('date_remboursement', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_remboursement', '<=', $request->date_end);
        }

        $parStatut = (clone $query)
            ->select('statut', DB::raw('COUNT(*) as nb'), DB::raw('SUM(montant) as total'))
            ->groupBy('statut')
            ->get();

        $totalEffectue = (float) (clone $query)->where('statut', 'EFFECTUE')->sum('montant');
        $totalDemande  = (float) (clone $query)->where('statut', 'DEMANDE')->sum('montant');

        return response()->json([
            'success' => true,
            'data'    => [
                'par_statut'     => $parStatut,
                'total_effectue' => $totalEffectue,
                'total_demande'  => $totalDemande,
            ],
        ]);
    }
}