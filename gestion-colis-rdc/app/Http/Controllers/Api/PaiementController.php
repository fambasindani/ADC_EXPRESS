<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Caisse;
use App\Models\Colis;
use App\Models\Devise;
use App\Models\Facture;
use App\Models\JournalActivite;
use App\Models\ModePaiement;
use App\Models\Paiement;
use App\Models\Sequence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class PaiementController extends Controller
{
    /**
     * GET /api/paiements/form-data
     * Données de référence de l'écran d'encaissement (accessible aux caissiers).
     */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'modes_paiement' => ModePaiement::where('actif', true)
                    ->orderBy('libelle')
                    ->get(['id', 'code', 'libelle']),
                'devises'        => Devise::where('actif', true)->get(['code', 'nom', 'symbole']),
                'moments'        => ['DEPOT', 'RETRAIT', 'AUTRE'],
            ],
        ]);
    }

    /**
     * GET /api/paiements
     *
     * Query params :
     *   - search           : recherche (reference_paiement, numéro suivi, payeur)
     *   - statut           : EN_ATTENTE | VALIDE | REJETE | ANNULE | REMBOURSE
     *   - moment_paiement  : DEPOT | RETRAIT | AUTRE
     *   - agence_id        : filtre par agence
     *   - mode_paiement_id : filtre par mode
     *   - devise_code      : CDF | USD
     *   - date_start       : date_paiement >= Y-m-d
     *   - date_end         : date_paiement <= Y-m-d
     *   - sort_by          : date_paiement | montant (défaut: date_paiement)
     *   - sort_dir         : asc | desc (défaut: desc)
     *   - per_page         : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Paiement::with([
            'colis:id,numero_suivi,nom_expediteur,nom_destinataire',
            'facture:id,numero_facture,montant_total',
            'agence:id,code,nom',
            'modePaiement:id,code,libelle,categorie',
            'encaissePar:id,nom,prenom',
            'caisse:id,code,libelle',
        ]);

        // 🔒 Restriction par agence
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_id', $user->agence_id);
        }

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('reference_paiement', 'like', "%{$s}%")
                  ->orWhere('reference_externe', 'like', "%{$s}%")
                  ->orWhere('payeur_nom', 'like', "%{$s}%")
                  ->orWhere('payeur_telephone', 'like', "%{$s}%")
                  ->orWhereHas('colis', fn($c) => $c
                      ->where('numero_suivi', 'like', "%{$s}%")
                      ->orWhere('nom_expediteur', 'like', "%{$s}%"));
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut') && in_array($request->statut, ['EN_ATTENTE', 'VALIDE', 'REJETE', 'ANNULE', 'REMBOURSE'])) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('moment_paiement') && in_array($request->moment_paiement, ['DEPOT', 'RETRAIT', 'AUTRE'])) {
            $query->where('moment_paiement', $request->moment_paiement);
        }
        if ($request->filled('agence_id')) {
            $query->where('agence_id', $request->agence_id);
        }
        if ($request->filled('mode_paiement_id')) {
            $query->where('mode_paiement_id', $request->mode_paiement_id);
        }
        if ($request->filled('devise_code')) {
            $query->where('devise_code', $request->devise_code);
        }
        if ($request->filled('date_start')) {
            $query->whereDate('date_paiement', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_paiement', '<=', $request->date_end);
        }

        // 📊 Tri
        $allowedSorts = ['date_paiement', 'montant', 'reference_paiement'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_paiement';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage  = min(max((int) $request->get('per_page', 15), 5), 100);
        $paiements = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $paiements->items(),
            'meta'    => [
                'current_page' => $paiements->currentPage(),
                'per_page'     => $paiements->perPage(),
                'total'        => $paiements->total(),
                'last_page'    => $paiements->lastPage(),
                'from'         => $paiements->firstItem(),
                'to'           => $paiements->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/paiements
     * Encaissement d'un paiement. Met à jour facture, colis et caisse en transaction.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'          => 'required|exists:colis,id',
            'mode_paiement_id'  => 'required|exists:modes_paiement,id',
            'caisse_id'         => 'nullable|exists:caisses,id',
            'montant'           => 'required|numeric|min:0.01',
            'devise_code'       => 'required|exists:devises,code',
            'moment_paiement'   => ['required', Rule::in(['DEPOT', 'RETRAIT', 'AUTRE'])],
            'payeur_nom'        => 'nullable|string|max:180',
            'payeur_telephone'  => 'nullable|string|max:30',
            'reference_externe' => 'nullable|string|max:120',
            'observations'      => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $paiement = DB::transaction(function () use ($request) {
                $user    = $request->user();
                $colis   = Colis::lockForUpdate()->findOrFail($request->colis_id);
                $facture = Facture::where('colis_id', $colis->id)->firstOrFail();

                // 🔒 Vérification devise
                if ($colis->devise_paiement !== $request->devise_code) {
                    throw new \Exception("La devise du paiement ({$request->devise_code}) doit correspondre à celle du colis ({$colis->devise_paiement}).");
                }

                // 🔒 Calcul du solde restant
                $dejaPaye = (float) Paiement::where('colis_id', $colis->id)
                    ->where('statut', 'VALIDE')
                    ->sum('montant');

                $solde = round((float) $colis->montant_transport - $dejaPaye, 2);

                if ($request->montant > $solde + 0.01) {
                    throw new \Exception("Le montant ({$request->montant}) dépasse le solde restant ({$solde} {$colis->devise_paiement}).");
                }

                // 🔒 Vérifier la caisse (devise + agence)
                if ($request->filled('caisse_id')) {
                    $caisse = Caisse::findOrFail($request->caisse_id);
                    if ($caisse->devise_code !== $request->devise_code) {
                        throw new \Exception("La caisse sélectionnée est en {$caisse->devise_code}, pas en {$request->devise_code}.");
                    }
                    if ($caisse->agence_id !== ($user->agence_id ?? $colis->agence_depot_id)) {
                        throw new \Exception("La caisse sélectionnée n'appartient pas à votre agence.");
                    }
                }

                // 💰 Créer le paiement
                $paiement = Paiement::create([
                    'reference_paiement' => Sequence::next('paiement'),
                    'facture_id'         => $facture->id,
                    'colis_id'           => $colis->id,
                    'agence_id'          => $user->agence_id ?? $colis->agence_depot_id,
                    'caisse_id'          => $request->caisse_id,
                    'mode_paiement_id'   => $request->mode_paiement_id,
                    'encaisse_par'       => $user->id,
                    'payeur_nom'         => $request->payeur_nom ?? $colis->nom_expediteur,
                    'payeur_telephone'   => $request->payeur_telephone ?? $colis->telephone_expediteur,
                    'montant'            => $request->montant,
                    'devise_code'        => $request->devise_code,
                    'reference_externe'  => $request->reference_externe,
                    'moment_paiement'    => $request->moment_paiement,
                    'statut'             => 'VALIDE',
                    'date_paiement'      => now(),
                    'observations'       => $request->observations,
                ]);

                // 📄 Mise à jour facture
                $nouveauSolde = round($solde - $request->montant, 2);
                $nouveauStatutFacture = $nouveauSolde <= 0.01 ? 'PAYEE' : 'PARTIELLE';
                $facture->update(['statut' => $nouveauStatutFacture]);

                // 📦 Mise à jour statut colis si totalement payé
                if ($nouveauSolde <= 0.01 && $colis->statut === 'EN_ATTENTE_PAIEMENT') {
                    $colis->update(['statut' => 'PRET_EXPEDITION']);
                }

                JournalActivite::enregistrer(
                    'paiement.store',
                    'paiements',
                    $paiement->id,
                    ['montant' => $paiement->montant, 'devise' => $paiement->devise_code],
                    $user
                );

                return $paiement;
            });

            return response()->json([
                'success' => true,
                'message' => 'Paiement enregistré avec succès.',
                'data'    => $paiement->load('colis', 'facture', 'modePaiement', 'caisse', 'encaissePar'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /api/paiements/{id}
     */
    public function show($id)
    {
        $paiement = Paiement::with([
            'colis.agenceDepot:id,code,nom',
            'colis.agenceDestination:id,code,nom',
            'facture',
            'agence:id,code,nom',
            'modePaiement',
            'caisse:id,code,libelle',
            'encaissePar:id,nom,prenom',
        ])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $paiement]);
    }

    /**
     * PUT /api/paiements/{id}
     * Modifie un paiement (montant, référence externe, observations).
     */
    public function update(Request $request, $id)
    {
        $paiement = Paiement::findOrFail($id);

        // On ne peut modifier que les paiements non validés ou les champs non financiers
        if ($paiement->statut === 'VALIDE') {
            $validator = Validator::make($request->all(), [
                'reference_externe' => 'nullable|string|max:120',
                'observations'      => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
            }

            $paiement->update($request->only(['reference_externe', 'observations']));
        } else {
            $validator = Validator::make($request->all(), [
                'montant'           => 'sometimes|required|numeric|min:0.01',
                'reference_externe' => 'nullable|string|max:120',
                'observations'      => 'nullable|string|max:500',
            ]);

            if ($validator->fails()) {
                return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
            }

            $paiement->update($request->only(['montant', 'reference_externe', 'observations']));
        }

        return response()->json([
            'success' => true,
            'message' => 'Paiement mis à jour.',
            'data'    => $paiement->fresh()->load('colis', 'facture', 'modePaiement'),
        ]);
    }

    /**
     * DELETE /api/paiements/{id}
     * Annule un paiement (soft cancel), met à jour la facture.
     */
    public function destroy($id)
    {
        $paiement = Paiement::findOrFail($id);

        if ($paiement->statut !== 'VALIDE') {
            return response()->json([
                'success' => false,
                'message' => 'Seuls les paiements VALIDE peuvent être annulés.',
            ], 422);
        }

        DB::transaction(function () use ($paiement) {
            $facture = $paiement->facture;

            // Annuler le paiement
            $paiement->update(['statut' => 'ANNULE']);

            // Recalculer le statut de la facture
            $nouveauPaye = (float) $facture->paiements()->where('statut', 'VALIDE')->sum('montant');
            $nouveauStatut = $nouveauPaye <= 0.01 ? 'EN_ATTENTE' : 'PARTIELLE';

            if ($nouveauPaye >= (float) $facture->montant_total - 0.01) {
                $nouveauStatut = 'PAYEE';
            }

            $facture->update(['statut' => $nouveauStatut]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Paiement annulé.',
            'data'    => $paiement->fresh(),
        ]);
    }

    /**
     * GET /api/paiements/{id}/recu
     * Données pour imprimer le reçu de paiement.
     */
    public function recu($id)
    {
        $paiement = Paiement::with([
            'colis.agenceDepot:id,code,nom',
            'colis.agenceDestination:id,code,nom',
            'colis.clientExpediteur',
            'facture',
            'agence:id,code,nom,adresse,telephone',
            'modePaiement',
            'encaissePar:id,nom,prenom',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'paiement'     => $paiement,
                'montant_lettres' => $this->montantEnLettres($paiement->montant, $paiement->devise_code),
            ],
        ]);
    }

    /**
     * GET /api/paiements/stats
     */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = Paiement::where('statut', 'VALIDE');

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_id', $user->agence_id);
        }

        if ($request->filled('date_start')) {
            $query->whereDate('date_paiement', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_paiement', '<=', $request->date_end);
        }

        $totaux = (clone $query)->select(
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant ELSE 0 END), 0) as total_usd'),
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant ELSE 0 END), 0) as total_cdf'),
            DB::raw('COUNT(*) as nb_paiements')
        )->first();

        $parMode = (clone $query)
            ->join('modes_paiement', 'paiements.mode_paiement_id', '=', 'modes_paiement.id')
            ->select('modes_paiement.libelle', 'modes_paiement.categorie', DB::raw('COUNT(*) as nb'), DB::raw('SUM(paiements.montant) as total'))
            ->groupBy('modes_paiement.id', 'modes_paiement.libelle', 'modes_paiement.categorie')
            ->get();

        $parMoment = (clone $query)
            ->select('moment_paiement', DB::raw('COUNT(*) as nb'), DB::raw('SUM(montant) as total'))
            ->groupBy('moment_paiement')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'totaux' => [
                    'total_usd'    => (float) $totaux->total_usd,
                    'total_cdf'    => (float) $totaux->total_cdf,
                    'nb_paiements' => (int) $totaux->nb_paiements,
                ],
                'par_mode'   => $parMode,
                'par_moment' => $parMoment,
            ],
        ]);
    }

    /**
     * GET /api/paiements/par-colis/{colisId}
     */
    public function parColis($colisId)
    {
        $colis = Colis::findOrFail($colisId);

        $paiements = $colis->paiements()
            ->with(['modePaiement', 'encaissePar:id,nom,prenom', 'caisse:id,code,libelle'])
            ->orderByDesc('date_paiement')
            ->get();

        $totalPaye = $paiements->where('statut', 'VALIDE')->sum('montant');
        $solde = round((float) $colis->montant_transport - $totalPaye, 2);

        return response()->json([
            'success' => true,
            'data'    => [
                'colis'       => $colis,
                'paiements'   => $paiements,
                'montant_transport' => (float) $colis->montant_transport,
                'total_paye'  => (float) $totalPaye,
                'solde'       => $solde,
                'est_paye'    => $solde <= 0.01,
            ],
        ]);
    }

    /**
     * Convertit un montant en lettres (simplifié FR).
     */
    private function montantEnLettres(float $montant, string $devise): string
    {
        // Version simplifiée — à enrichir si besoin
        $entier = (int) floor($montant);
        $decimales = (int) round(($montant - $entier) * 100);

        $lettres = $this->nombreEnLettres($entier);
        $deviseNom = $devise === 'USD' ? 'dollars americains' : 'francs congolais';

        $result = ucfirst($lettres) . ' ' . $deviseNom;
        if ($decimales > 0) {
            $result .= ' et ' . $this->nombreEnLettres($decimales) . ' centimes';
        }

        return $result;
    }

    private function nombreEnLettres(int $n): string
    {
        if ($n === 0) return 'zero';

        $unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
                   'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
        $dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

        if ($n < 20) return $unites[$n];
        if ($n < 100) {
            $d = intdiv($n, 10);
            $u = $n % 10;
            return $dizaines[$d] . ($u > 0 ? '-' . $unites[$u] : '');
        }
        if ($n < 1000) {
            $c = intdiv($n, 100);
            $r = $n % 100;
            $prefix = $c === 1 ? 'cent' : $unites[$c] . ' cent';
            return $prefix . ($r > 0 ? ' ' . $this->nombreEnLettres($r) : '');
        }
        if ($n < 1000000) {
            $m = intdiv($n, 1000);
            $r = $n % 1000;
            $prefix = $m === 1 ? 'mille' : $this->nombreEnLettres($m) . ' mille';
            return $prefix . ($r > 0 ? ' ' . $this->nombreEnLettres($r) : '');
        }
        $m = intdiv($n, 1000000);
        $r = $n % 1000000;
        $prefix = $m === 1 ? 'un million' : $this->nombreEnLettres($m) . ' millions';
        return $prefix . ($r > 0 ? ' ' . $this->nombreEnLettres($r) : '');
    }
}