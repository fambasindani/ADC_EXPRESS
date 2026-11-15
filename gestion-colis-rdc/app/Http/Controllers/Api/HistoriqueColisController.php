<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\HistoriqueColis;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class HistoriqueColisController extends Controller
{
    /**
     * GET /api/historique
     * Filtres : colis_id, agence_id, user_id, statut, date_start, date_end
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = HistoriqueColis::with([
            'colis:id,numero_suivi,nom_expediteur,nom_destinataire',
            'agence:id,code,nom',
            'user:id,nom,prenom',
        ]);

        // Restriction par agence
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where(function ($q) use ($user) {
                $q->where('agence_id', $user->agence_id)
                  ->orWhereHas('colis', fn($c) => $c
                      ->where('agence_depot_id', $user->agence_id)
                      ->orWhere('agence_destination_id', $user->agence_id));
            });
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q
                ->where('commentaire', 'like', "%{$s}%")
                ->orWhereHas('colis', fn($c) => $c
                    ->where('numero_suivi', 'like', "%{$s}%")
                    ->orWhere('nom_expediteur', 'like', "%{$s}%")
                    ->orWhere('nom_destinataire', 'like', "%{$s}%")));
        }

        if ($request->filled('colis_id'))       $query->where('colis_id', $request->colis_id);
        if ($request->filled('agence_id'))      $query->where('agence_id', $request->agence_id);
        if ($request->filled('user_id'))        $query->where('user_id', $request->user_id);
        if ($request->filled('nouveau_statut')) $query->where('nouveau_statut', $request->nouveau_statut);
        if ($request->filled('date_start'))     $query->whereDate('date_evenement', '>=', $request->date_start);
        if ($request->filled('date_end'))       $query->whereDate('date_evenement', '<=', $request->date_end);

        $perPage = min(max((int) $request->get('per_page', 20), 5), 100);
        $items   = $query->orderByDesc('date_evenement')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $items->items(),
            'meta'    => [
                'current_page' => $items->currentPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'last_page'    => $items->lastPage(),
            ],
        ]);
    }

    /** GET /api/historique/{id} */
    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data'    => HistoriqueColis::with(['colis', 'agence', 'user'])->findOrFail($id),
        ]);
    }

    /**
     * POST /api/historique
     * Ajout manuel d'un événement (rare, mais utile pour commentaires).
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'       => 'required|exists:colis,id',
            'agence_id'      => 'nullable|exists:agences,id',
            'nouveau_statut' => ['required', Rule::in([
                'ENREGISTRE', 'EN_ATTENTE_PAIEMENT', 'PRET_EXPEDITION',
                'EN_TRANSIT', 'ARRIVE_AGENCE', 'EN_LIVRAISON',
                'LIVRE', 'RETIRE', 'ANNULE', 'PERDU', 'ENDOMMAGE', 'RETOUR',
            ])],
            'commentaire'    => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $colis = Colis::findOrFail($request->colis_id);
        $event = HistoriqueColis::create([
            'colis_id'       => $colis->id,
            'agence_id'      => $request->agence_id ?? $request->user()->agence_id,
            'user_id'        => $request->user()->id,
            'ancien_statut'  => $colis->statut,
            'nouveau_statut' => $request->nouveau_statut,
            'commentaire'    => $request->commentaire,
            'date_evenement' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Événement ajouté à l\'historique.',
            'data'    => $event->load('colis', 'agence', 'user'),
        ], 201);
    }

    /** PUT /api/historique/{id} — uniquement le commentaire */
    public function update(Request $request, $id)
    {
        $event = HistoriqueColis::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'commentaire' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $event->update($request->only('commentaire'));

        return response()->json([
            'success' => true,
            'message' => 'Événement mis à jour.',
            'data'    => $event->fresh(),
        ]);
    }

    /**
     * DELETE /api/historique/{id}
     * Interdit sur les événements critiques (LIVRE, RETIRE, ANNULE).
     */
    public function destroy($id)
    {
        $event = HistoriqueColis::findOrFail($id);

        if (in_array($event->nouveau_statut, ['LIVRE', 'RETIRE', 'ANNULE'])) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer un événement terminal (LIVRE, RETIRE, ANNULE).',
            ], 422);
        }

        $event->delete();

        return response()->json(['success' => true, 'message' => 'Événement supprimé.']);
    }

    /**
     * GET /api/historique/timeline/{colisId}
     * Timeline complète d'un colis (ordonnée chronologiquement).
     */
    public function timeline($colisId)
    {
        $colis = Colis::findOrFail($colisId);

        $timeline = $colis->historique()
            ->with(['agence:id,code,nom', 'user:id,nom,prenom'])
            ->orderBy('date_evenement', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'colis' => [
                    'id'           => $colis->id,
                    'numero_suivi' => $colis->numero_suivi,
                    'statut'       => $colis->statut,
                ],
                'timeline' => $timeline,
            ],
        ]);
    }

    /**
     * GET /api/historique/stats
     */
    public function stats(Request $request)
    {
        $user  = $request->user();
        $query = HistoriqueColis::query();

        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where(function ($q) use ($user) {
                $q->where('agence_id', $user->agence_id)
                  ->orWhereHas('colis', fn($c) => $c
                      ->where('agence_depot_id', $user->agence_id)
                      ->orWhere('agence_destination_id', $user->agence_id));
            });
        }

        if ($request->filled('date_start')) $query->whereDate('date_evenement', '>=', $request->date_start);
        if ($request->filled('date_end'))   $query->whereDate('date_evenement', '<=', $request->date_end);

        $parStatut = (clone $query)
            ->select('nouveau_statut', DB::raw('COUNT(*) as total'))
            ->groupBy('nouveau_statut')
            ->pluck('total', 'nouveau_statut');

        $parJour = (clone $query)
            ->where('date_evenement', '>=', now()->subDays(30))
            ->select(DB::raw('DATE(date_evenement) as jour'), DB::raw('COUNT(*) as total'))
            ->groupBy('jour')
            ->orderBy('jour')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'par_statut' => $parStatut,
                'par_jour'   => $parJour,
            ],
        ]);
    }
}