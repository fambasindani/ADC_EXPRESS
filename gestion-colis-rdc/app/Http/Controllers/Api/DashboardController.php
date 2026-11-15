<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Colis;
use App\Models\Facture;
use App\Models\Livraison;
use App\Models\Paiement;
use App\Models\Retrait;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/dashboard/stats
     * KPI principaux + colis récents + répartition par statut.
     */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = Colis::query();

        // 🔒 Restriction par agence
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where(function ($q) use ($user) {
                $q->where('agence_depot_id', $user->agence_id)
                  ->orWhere('agence_destination_id', $user->agence_id);
            });
        }

        // 📦 KPI colis
        $totalColis    = (clone $query)->count();
        $enTransit     = (clone $query)->whereIn('statut', ['EN_TRANSIT', 'EN_LIVRAISON'])->count();
        $arriveAgence  = (clone $query)->where('statut', 'ARRIVE_AGENCE')->count();
        $enAttentePaie = (clone $query)->where('statut', 'EN_ATTENTE_PAIEMENT')->count();
        $livres        = (clone $query)->whereIn('statut', ['LIVRE', 'RETIRE'])->count();
        $annules       = (clone $query)->where('statut', 'ANNULE')->count();

        // 📦 Colis créés aujourd'hui / cette semaine / ce mois
        $aujourdhui = (clone $query)->whereDate('date_depot', now()->toDateString())->count();
        $semaine    = (clone $query)->where('date_depot', '>=', now()->startOfWeek())->count();
        $mois       = (clone $query)->where('date_depot', '>=', now()->startOfMonth())->count();

        // 💰 Recettes du jour (paiements valides)
        $recettesQuery = Paiement::whereDate('date_paiement', now()->toDateString())
            ->where('statut', 'VALIDE');

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $recettesQuery->where('agence_id', $user->agence_id);
        }

        $recettes = $recettesQuery->select(
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant ELSE 0 END), 0) as usd'),
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant ELSE 0 END), 0) as cdf')
        )->first();

        // 💰 Recettes du mois
        $recettesMoisQuery = Paiement::where('date_paiement', '>=', now()->startOfMonth())
            ->where('statut', 'VALIDE');

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $recettesMoisQuery->where('agence_id', $user->agence_id);
        }

        $recettesMois = $recettesMoisQuery->select(
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant ELSE 0 END), 0) as usd'),
            DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant ELSE 0 END), 0) as cdf')
        )->first();

        // 📋 Colis récents (5 derniers)
        $recents = (clone $query)
            ->with([
                'agenceDepot:id,code,nom',
                'agenceDestination:id,code,nom',
                'villeDestination:id,nom',
            ])
            ->orderByDesc('date_depot')
            ->limit(5)
            ->get();

        // 📊 Répartition par statut
        $parStatut = (clone $query)
            ->select('statut', DB::raw('COUNT(*) as total'))
            ->groupBy('statut')
            ->pluck('total', 'statut');

        // 📊 Répartition par mode facturation
        $parModeFacturation = (clone $query)
            ->select('mode_facturation', DB::raw('COUNT(*) as total'), DB::raw('SUM(montant_transport) as montant'))
            ->groupBy('mode_facturation')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'kpi' => [
                    'total_colis'         => $totalColis,
                    'en_transit'          => $enTransit,
                    'arrive_agence'       => $arriveAgence,
                    'en_attente_paiement' => $enAttentePaie,
                    'livres'              => $livres,
                    'annules'             => $annules,
                    'aujourdhui'          => $aujourdhui,
                    'semaine'             => $semaine,
                    'mois'                => $mois,
                ],
                'recettes' => [
                    'jour' => [
                        'usd' => (float) $recettes->usd,
                        'cdf' => (float) $recettes->cdf,
                    ],
                    'mois' => [
                        'usd' => (float) $recettesMois->usd,
                        'cdf' => (float) $recettesMois->cdf,
                    ],
                ],
                'colis_recents'        => $recents,
                'par_statut'           => $parStatut,
                'par_mode_facturation' => $parModeFacturation,
            ],
        ]);
    }

    /**
     * GET /api/dashboard/charts?days=30
     * Graphiques : colis par jour, recettes par jour, top agences.
     */
    public function charts(Request $request)
    {
        $user  = $request->user();
        $days  = min(max((int) $request->get('days', 30), 1), 365);
        $start = now()->subDays($days)->startOfDay();

        $colisQuery = Colis::where('date_depot', '>=', $start);
        $paiementQuery = Paiement::where('date_paiement', '>=', $start)->where('statut', 'VALIDE');

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $colisQuery->where(function ($q) use ($user) {
                $q->where('agence_depot_id', $user->agence_id)
                  ->orWhere('agence_destination_id', $user->agence_id);
            });
            $paiementQuery->where('agence_id', $user->agence_id);
        }

        // 📈 Colis créés par jour
        $colisParJour = $colisQuery
            ->select(DB::raw('DATE(date_depot) as jour'), DB::raw('COUNT(*) as total'))
            ->groupBy('jour')
            ->orderBy('jour')
            ->get();

        // 📈 Recettes par jour
        $recettesParJour = $paiementQuery
            ->select(
                DB::raw('DATE(date_paiement) as jour'),
                DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant ELSE 0 END), 0) as usd'),
                DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant ELSE 0 END), 0) as cdf')
            )
            ->groupBy('jour')
            ->orderBy('jour')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'periode'           => [
                    'jours' => $days,
                    'debut' => $start->toDateString(),
                    'fin'   => now()->toDateString(),
                ],
                'colis_par_jour'    => $colisParJour,
                'recettes_par_jour' => $recettesParJour,
            ],
        ]);
    }

    /**
     * GET /api/dashboard/top-agences
     * Classement des agences par volume de colis et recettes.
     */
    public function topAgences(Request $request)
    {
        $user = $request->user();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN')) {
            return response()->json([
                'success' => false,
                'message' => 'Accès réservé aux administrateurs.',
            ], 403);
        }

        $limit = min(max((int) $request->get('limit', 10), 5), 50);

        // Top par volume de colis (dépôt)
        $topVolume = Agence::select('agences.id', 'agences.code', 'agences.nom', 'agences.type_agence')
            ->selectRaw('COUNT(colis.id) as total_colis')
            ->leftJoin('colis', 'colis.agence_depot_id', '=', 'agences.id')
            ->where('agences.actif', true)
            ->groupBy('agences.id', 'agences.code', 'agences.nom', 'agences.type_agence')
            ->orderByDesc('total_colis')
            ->limit($limit)
            ->get();

        // Top par recettes
        $topRecettes = Agence::select('agences.id', 'agences.code', 'agences.nom')
            ->selectRaw('COALESCE(SUM(CASE WHEN paiements.devise_code = "USD" THEN paiements.montant ELSE 0 END), 0) as total_usd')
            ->selectRaw('COALESCE(SUM(CASE WHEN paiements.devise_code = "CDF" THEN paiements.montant ELSE 0 END), 0) as total_cdf')
            ->leftJoin('paiements', function ($join) {
                $join->on('paiements.agence_id', '=', 'agences.id')
                     ->where('paiements.statut', '=', 'VALIDE');
            })
            ->where('agences.actif', true)
            ->groupBy('agences.id', 'agences.code', 'agences.nom')
            ->orderByDesc('total_usd')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'top_volume'   => $topVolume,
                'top_recettes' => $topRecettes,
            ],
        ]);
    }

    /**
     * GET /api/dashboard/top-livreurs
     */
    public function topLivreurs(Request $request)
    {
        $user = $request->user();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && ! $user->hasRole('DIRECTEUR_AGENCE')) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $limit = min(max((int) $request->get('limit', 10), 5), 50);

        $query = Livraison::select(
                'livreur_id',
                DB::raw('COUNT(*) as total_livraisons'),
                DB::raw('SUM(CASE WHEN statut = "LIVRE" THEN 1 ELSE 0 END) as livrees'),
                DB::raw('SUM(CASE WHEN statut = "ECHEC" THEN 1 ELSE 0 END) as echecs')
            )
            ->where('date_affectation', '>=', now()->subDays(30))
            ->groupBy('livreur_id')
            ->orderByDesc('livrees')
            ->limit($limit);

        $rows = $query->get();

        $livreurs = User::with([])
            ->whereIn('id', $rows->pluck('livreur_id'))
            ->get(['id', 'nom', 'postnom', 'prenom', 'telephone'])
            ->keyBy('id');

        $result = $rows->map(fn ($row) => [
            'livreur'          => $livreurs->get($row->livreur_id),
            'total_livraisons' => (int) $row->total_livraisons,
            'livrees'          => (int) $row->livrees,
            'echecs'           => (int) $row->echecs,
            'taux_reussite'    => $row->total_livraisons > 0
                ? round(($row->livrees / $row->total_livraisons) * 100, 1)
                : 0,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $result,
        ]);
    }

    /**
     * GET /api/dashboard/alertes
     * Alertes : colis bloqués, retards, factures impayées, livraisons échouées.
     */
    public function alertes(Request $request)
    {
        $user = $request->user();
        $colisQuery = Colis::query();
        $paiementQuery = Paiement::query();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $colisQuery->where(function ($q) use ($user) {
                $q->where('agence_depot_id', $user->agence_id)
                  ->orWhere('agence_destination_id', $user->agence_id);
            });
            $paiementQuery->where('agence_id', $user->agence_id);
        }

        // ⚠️ Colis en retard (date estimée dépassée, toujours en transit)
        $enRetard = (clone $colisQuery)
            ->where('date_estimee_arrivee', '<', now()->toDateString())
            ->whereIn('statut', ['EN_TRANSIT', 'ENREGISTRE', 'PRET_EXPEDITION'])
            ->with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->limit(10)
            ->get();

        // ⚠️ Colis bloqués (ARRIVE_AGENCE depuis plus de 15 jours)
        $bloques = (clone $colisQuery)
            ->where('statut', 'ARRIVE_AGENCE')
            ->where('date_arrivee', '<', now()->subDays(15))
            ->with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom'])
            ->limit(10)
            ->get();

        // ⚠️ Factures impayées (EN_ATTENTE depuis plus de 30 jours)
        $impayees = Facture::where('statut', 'EN_ATTENTE')
            ->where('date_facture', '<', now()->subDays(30))
            ->with(['colis:id,numero_suivi,nom_expediteur'])
            ->limit(10)
            ->get();

        // ⚠️ Livraisons échouées non reprogrammées
        $echecs = Livraison::where('statut', 'ECHEC')
            ->where('date_affectation', '<', now()->subDays(3))
            ->with(['colis:id,numero_suivi,nom_destinataire', 'livreur:id,nom,prenom'])
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'en_retard'   => $enRetard,
                'bloques'     => $bloques,
                'impayees'    => $impayees,
                'echecs'      => $echecs,
                'compteurs'   => [
                    'en_retard' => $enRetard->count(),
                    'bloques'   => $bloques->count(),
                    'impayees'  => $impayees->count(),
                    'echecs'    => $echecs->count(),
                ],
            ],
        ]);
    }

    /**
     * GET /api/dashboard/activite-recente
     * Derniers événements (historique colis + paiements).
     */
    public function activiteRecente(Request $request)
    {
        $user  = $request->user();
        $limit = min(max((int) $request->get('limit', 15), 5), 50);

        $historique = DB::table('historique_colis')
            ->join('colis', 'historique_colis.colis_id', '=', 'colis.id')
            ->leftJoin('users', 'historique_colis.user_id', '=', 'users.id')
            ->leftJoin('agences', 'historique_colis.agence_id', '=', 'agences.id')
            ->select(
                'historique_colis.id',
                'historique_colis.nouveau_statut as evenement',
                'historique_colis.commentaire',
                'historique_colis.date_evenement as date',
                'colis.numero_suivi as reference',
                'users.nom as user_nom',
                'agences.code as agence_code',
                DB::raw('"historique" as type')
            );

        $paiements = DB::table('paiements')
            ->join('colis', 'paiements.colis_id', '=', 'colis.id')
            ->leftJoin('users', 'paiements.encaisse_par', '=', 'users.id')
            ->select(
                'paiements.id',
                DB::raw('"PAIEMENT" as evenement'),
                DB::raw('CONCAT(paiements.montant, " ", paiements.devise_code) as commentaire'),
                'paiements.date_paiement as date',
                'colis.numero_suivi as reference',
                'users.nom as user_nom',
                DB::raw('NULL as agence_code'),
                DB::raw('"paiement" as type')
            );

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $historique->where(function ($q) use ($user) {
                $q->where('historique_colis.agence_id', $user->agence_id)
                  ->orWhere('colis.agence_depot_id', $user->agence_id)
                  ->orWhere('colis.agence_destination_id', $user->agence_id);
            });
            $paiements->where('paiements.agence_id', $user->agence_id);
        }

        $activite = $historique->union($paiements)
            ->orderByDesc('date')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $activite,
        ]);
    }

    /**
     * GET /api/dashboard/performance
     * Taux de réussite, délai moyen, satisfaction.
     */
    public function performance(Request $request)
    {
        $user = $request->user();
        $colisQuery = Colis::query();
        $livraisonQuery = Livraison::query();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $colisQuery->where(function ($q) use ($user) {
                $q->where('agence_depot_id', $user->agence_id)
                  ->orWhere('agence_destination_id', $user->agence_id);
            });
            $livraisonQuery->whereHas('colis', fn($c) => $c
                ->where('agence_depot_id', $user->agence_id)
                ->orWhere('agence_destination_id', $user->agence_id));
        }

        $totalColis = (clone $colisQuery)->count();

        // Taux de réussite livraison
        $livrees = (clone $livraisonQuery)->where('statut', 'LIVRE')->count();
        $echecs  = (clone $livraisonQuery)->where('statut', 'ECHEC')->count();
        $tauxReussite = ($livrees + $echecs) > 0
            ? round(($livrees / ($livrees + $echecs)) * 100, 1)
            : 0;

        // Délai moyen de livraison (jours entre date_depot et date_livraison)
        $delaiMoyen = DB::table('colis')
            ->whereNotNull('date_arrivee')
            ->whereIn('statut', ['LIVRE', 'RETIRE'])
            ->selectRaw('AVG(DATEDIFF(date_arrivee, date_depot)) as moyenne')
            ->value('moyenne');

        // Taux de colis livrés
        $livresCount = (clone $colisQuery)->whereIn('statut', ['LIVRE', 'RETIRE'])->count();
        $tauxLivraison = $totalColis > 0
            ? round(($livresCount / $totalColis) * 100, 1)
            : 0;

        // Taux de colis annulés
        $annulesCount = (clone $colisQuery)->where('statut', 'ANNULE')->count();
        $tauxAnnulation = $totalColis > 0
            ? round(($annulesCount / $totalColis) * 100, 1)
            : 0;

        return response()->json([
            'success' => true,
            'data'    => [
                'taux_reussite_livraison' => $tauxReussite,
                'taux_livraison_global'   => $tauxLivraison,
                'taux_annulation'         => $tauxAnnulation,
                'delai_moyen_jours'       => $delaiMoyen ? round((float) $delaiMoyen, 1) : null,
                'total_colis'             => $totalColis,
                'livrees'                 => $livrees,
                'echecs'                  => $echecs,
            ],
        ]);
    }

    /**
     * GET /api/dashboard/agence/{id}
     * Vue détaillée d'une agence (KPI + graphiques + alertes).
     */
    public function agence($id, Request $request)
    {
        $user   = $request->user();
        $agence = Agence::with('ville:id,nom', 'province:id,code,nom')->findOrFail($id);

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->hasRole('DIRECTEUR_AGENCE') && $user->agence_id !== (int) $id) {
            return response()->json(['success' => false, 'message' => 'Accès refusé.'], 403);
        }

        $colisDepot   = Colis::where('agence_depot_id', $id)->count();
        $colisDest    = Colis::where('agence_destination_id', $id)->count();
        $colisTransit = Colis::where('agence_depot_id', $id)->where('statut', 'EN_TRANSIT')->count();
        $colisArrives = Colis::where('agence_destination_id', $id)->where('statut', 'ARRIVE_AGENCE')->count();
        $colisRetires = Colis::where('agence_destination_id', $id)->where('statut', 'RETIRE')->count();

        $recettes = Paiement::where('agence_id', $id)->where('statut', 'VALIDE')
            ->select(
                DB::raw('COALESCE(SUM(CASE WHEN devise_code = "USD" THEN montant ELSE 0 END), 0) as usd'),
                DB::raw('COALESCE(SUM(CASE WHEN devise_code = "CDF" THEN montant ELSE 0 END), 0) as cdf')
            )->first();

        $retraits = Retrait::where('agence_id', $id)->count();
        $users    = User::where('agence_id', $id)->where('statut', 'ACTIF')->count();
        $caisses  = \App\Models\Caisse::where('agence_id', $id)->count();

        return response()->json([
            'success' => true,
            'data'    => [
                'agence'  => $agence,
                'colis'   => [
                    'depot'      => $colisDepot,
                    'destination' => $colisDest,
                    'en_transit'  => $colisTransit,
                    'arrives'     => $colisArrives,
                    'retires'     => $colisRetires,
                ],
                'recettes' => [
                    'usd' => (float) $recettes->usd,
                    'cdf' => (float) $recettes->cdf,
                ],
                'retraits' => $retraits,
                'users'    => $users,
                'caisses'  => $caisses,
            ],
        ]);
    }
}