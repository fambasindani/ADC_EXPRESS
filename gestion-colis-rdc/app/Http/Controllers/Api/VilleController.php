<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ville;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class VilleController extends Controller
{
    /**
     * GET /api/villes
     * Query : search, province_id, actif, per_page, page
     */
    public function index(Request $request)
    {
        $query = Ville::with('province:id,code,nom')
            ->withCount('communes')
            ->withCount('agences');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where('nom', 'like', "%{$s}%");
        }

        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }

        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        $query->orderBy('nom', 'asc');

        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $villes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $villes->items(),
            'meta'    => [
                'current_page' => $villes->currentPage(),
                'per_page'     => $villes->perPage(),
                'total'        => $villes->total(),
                'last_page'    => $villes->lastPage(),
                'from'         => $villes->firstItem(),
                'to'           => $villes->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/villes
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'province_id' => 'required|exists:provinces,id',
            'nom'         => [
                'required', 'string', 'max:120',
                Rule::unique('villes')->where(fn ($q) => $q->where('province_id', $request->province_id)),
            ],
            'actif'       => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $ville = Ville::create([
            'province_id' => $request->province_id,
            'nom'         => $request->nom,
            'actif'       => $request->input('actif', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ville créée avec succès.',
            'data'    => $ville->load('province:id,code,nom'),
        ], 201);
    }

    /**
     * GET /api/villes/{id}
     */
    public function show($id)
    {
        $ville = Ville::with([
            'province:id,code,nom',
            'communes:id,ville_id,nom,actif',
            'agences:id,ville_id,code,nom,type_agence',
        ])->withCount(['communes', 'agences'])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $ville]);
    }

    /**
     * PUT /api/villes/{id}
     */
    public function update(Request $request, $id)
    {
        $ville = Ville::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'province_id' => 'sometimes|required|exists:provinces,id',
            'nom'         => [
                'sometimes', 'required', 'string', 'max:120',
                Rule::unique('villes')
                    ->where(fn ($q) => $q->where('province_id', $request->input('province_id', $ville->province_id)))
                    ->ignore($ville->id),
            ],
            'actif'       => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $ville->update($request->only(['province_id', 'nom', 'actif']));

        return response()->json([
            'success' => true,
            'message' => 'Ville mise à jour.',
            'data'    => $ville->fresh()->load('province:id,code,nom'),
        ]);
    }

    /**
     * DELETE /api/villes/{id}
     * Refuse si communes ou agences rattachées.
     */
    public function destroy($id)
    {
        $ville = Ville::findOrFail($id);

        if ($ville->communes()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette ville a des communes rattachées.',
            ], 409);
        }

        if ($ville->agences()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette ville a des agences rattachées.',
            ], 409);
        }

        $ville->delete();

        return response()->json([
            'success' => true,
            'message' => 'Ville supprimée.',
        ]);
    }
}