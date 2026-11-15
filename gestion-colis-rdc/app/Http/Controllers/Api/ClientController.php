<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Ville;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    /**
     * GET /api/clients
     *
     * Query params :
     *   - search      : recherche (nom, téléphone, email, code)
     *   - type_client : PERSONNE_PHYSIQUE | ENTREPRISE
     *   - ville_id    : filtre par ville
     *   - sort_by     : nom | created_at | telephone (défaut: created_at)
     *   - sort_dir    : asc | desc (défaut: desc)
     *   - per_page    : 5..100 (défaut: 15)
     *   - page        : numéro de page
     */
    public function index(Request $request)
    {
        $query = Client::with('ville:id,nom,province_id');

        // 🔍 Recherche full-text
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('nom_ou_raison_sociale', 'like', "%{$s}%")
                  ->orWhere('postnom', 'like', "%{$s}%")
                  ->orWhere('prenom', 'like', "%{$s}%")
                  ->orWhere('telephone', 'like', "%{$s}%")
                  ->orWhere('telephone_secondaire', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('code_client', 'like', "%{$s}%");
            });
        }

        // 🎯 Filtres
        if ($request->filled('type_client') && in_array($request->type_client, ['PERSONNE_PHYSIQUE', 'ENTREPRISE'])) {
            $query->where('type_client', $request->type_client);
        }

        if ($request->filled('ville_id')) {
            $query->where('ville_id', $request->ville_id);
        }

        // 📊 Tri
        $allowedSorts = ['nom_ou_raison_sociale', 'telephone', 'created_at', 'code_client'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'created_at';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $clients = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $clients->items(),
            'meta'    => [
                'current_page' => $clients->currentPage(),
                'per_page'     => $clients->perPage(),
                'total'        => $clients->total(),
                'last_page'    => $clients->lastPage(),
                'from'         => $clients->firstItem(),
                'to'           => $clients->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/clients
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type_client'           => ['nullable', Rule::in(['PERSONNE_PHYSIQUE', 'ENTREPRISE'])],
            'nom_ou_raison_sociale' => 'required|string|max:180',
            'postnom'               => 'nullable|string|max:100',
            'prenom'                => 'nullable|string|max:100',
            'telephone'             => 'required|string|max:30',
            'telephone_secondaire'  => 'nullable|string|max:30',
            'email'                 => 'nullable|email|max:150',
            'adresse'               => 'nullable|string|max:255',
            'ville_id'              => 'nullable|exists:villes,id',
            'piece_identite_type'   => 'nullable|string|max:60',
            'piece_identite_numero' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $client = DB::transaction(function () use ($request) {
                // Génération atomique du code client
                $nextId = (Client::max('id') ?? 0) + 1;
                $codeClient = 'CLI-' . str_pad((string) $nextId, 5, '0', STR_PAD_LEFT);

                return Client::create([
                    'code_client'           => $codeClient,
                    'type_client'           => $request->input('type_client', 'PERSONNE_PHYSIQUE'),
                    'nom_ou_raison_sociale' => $request->nom_ou_raison_sociale,
                    'postnom'               => $request->postnom,
                    'prenom'                => $request->prenom,
                    'telephone'             => $request->telephone,
                    'telephone_secondaire'  => $request->telephone_secondaire,
                    'email'                 => $request->email,
                    'adresse'               => $request->adresse,
                    'ville_id'              => $request->ville_id,
                    'piece_identite_type'   => $request->piece_identite_type,
                    'piece_identite_numero' => $request->piece_identite_numero,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Client créé avec succès.',
                'data'    => $client->load('ville'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/clients/{id}
     * Inclut les derniers colis du client.
     */
    public function show($id)
    {
        $client = Client::with([
            'ville:id,nom,province_id',
            'colis' => fn ($q) => $q->latest('date_depot')->limit(10),
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $client,
        ]);
    }

    /**
     * PUT /api/clients/{id}
     */
    public function update(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'type_client'           => ['nullable', Rule::in(['PERSONNE_PHYSIQUE', 'ENTREPRISE'])],
            'nom_ou_raison_sociale' => 'sometimes|required|string|max:180',
            'postnom'               => 'nullable|string|max:100',
            'prenom'                => 'nullable|string|max:100',
            'telephone'             => 'sometimes|required|string|max:30',
            'telephone_secondaire'  => 'nullable|string|max:30',
            'email'                 => 'nullable|email|max:150',
            'adresse'               => 'nullable|string|max:255',
            'ville_id'              => 'nullable|exists:villes,id',
            'piece_identite_type'   => 'nullable|string|max:60',
            'piece_identite_numero' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $client->update($request->only([
            'type_client', 'nom_ou_raison_sociale', 'postnom', 'prenom',
            'telephone', 'telephone_secondaire', 'email', 'adresse',
            'ville_id', 'piece_identite_type', 'piece_identite_numero',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Client mis à jour.',
            'data'    => $client->fresh()->load('ville'),
        ]);
    }

    /**
     * DELETE /api/clients/{id}
     * Refuse la suppression si le client a des colis associés.
     */
    public function destroy($id)
    {
        $client = Client::findOrFail($id);

        if ($client->colis()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : ce client a des colis associés.',
            ], 409);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Client supprimé.',
        ]);
    }

    /**
     * GET /api/clients/form-data
     * Alimente le formulaire de création/modification.
     */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'villes'       => Ville::where('actif', true)
                                    ->orderBy('nom')
                                    ->get(['id', 'nom', 'province_id']),
                'types_client' => ['PERSONNE_PHYSIQUE', 'ENTREPRISE'],
                'types_piece'  => [
                    'CARTE_IDENTITE',
                    'PASSEPORT',
                    'PERMIS_CONDUIRE',
                    'CARTE_ELECTEUR',
                    'RCCM',
                    'AUTRE',
                ],
            ],
        ]);
    }

    /**
     * GET /api/clients/{id}/colis
     * Liste complète des colis d'un client (avec pagination).
     */
    public function colis(Request $request, $id)
    {
        $client = Client::findOrFail($id);
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);

        $colis = $client->colis()
            ->with(['agenceDepot:id,code,nom', 'agenceDestination:id,code,nom', 'villeDestination:id,nom'])
            ->latest('date_depot')
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
}