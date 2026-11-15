<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Commune;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class CommuneController extends Controller
{
    /**
     * GET /api/communes
     * Query : search, ville_id, actif, per_page, page
     */
    public function index(Request $request)
    {
        $query = Commune::with('ville:id,nom,province_id')
            ->with('ville.province:id,code,nom')
            ->withCount('agences');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where('nom', 'like', "%{$s}%");
        }

        if ($request->filled('ville_id')) {
            $query->where('ville_id', $request->ville_id);
        }

        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        $query->orderBy('nom', 'asc');

        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $communes = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $communes->items(),
            'meta'    => [
                'current_page' => $communes->currentPage(),
                'per_page'     => $communes->perPage(),
                'total'        => $communes->total(),
                'last_page'    => $communes->lastPage(),
                'from'         => $communes->firstItem(),
                'to'           => $communes->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/communes
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'ville_id' => 'required|exists:villes,id',
            'nom'      => [
                'required', 'string', 'max:120',
                Rule::unique('communes')->where(fn ($q) => $q->where('ville_id', $request->ville_id)),
            ],
            'actif'    => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $commune = Commune::create([
            'ville_id' => $request->ville_id,
            'nom'      => $request->nom,
            'actif'    => $request->input('actif', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Commune créée avec succès.',
            'data'    => $commune->load('ville:id,nom,province_id', 'ville.province:id,code,nom'),
        ], 201);
    }

    /**
     * GET /api/communes/{id}
     */
    public function show($id)
    {
        $commune = Commune::with([
            'ville:id,nom,province_id',
            'ville.province:id,code,nom',
            'agences:id,commune_id,code,nom,type_agence',
        ])->withCount('agences')->findOrFail($id);

        return response()->json(['success' => true, 'data' => $commune]);
    }

    /**
     * PUT /api/communes/{id}
     */
    public function update(Request $request, $id)
    {
        $commune = Commune::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'ville_id' => 'sometimes|required|exists:villes,id',
            'nom'      => [
                'sometimes', 'required', 'string', 'max:120',
                Rule::unique('communes')
                    ->where(fn ($q) => $q->where('ville_id', $request->input('ville_id', $commune->ville_id)))
                    ->ignore($commune->id),
            ],
            'actif'    => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $commune->update($request->only(['ville_id', 'nom', 'actif']));

        return response()->json([
            'success' => true,
            'message' => 'Commune mise à jour.',
            'data'    => $commune->fresh()->load('ville:id,nom,province_id', 'ville.province:id,code,nom'),
        ]);
    }

    /**
     * DELETE /api/communes/{id}
     * Refuse si agences rattachées.
     */
    public function destroy($id)
    {
        $commune = Commune::findOrFail($id);

        if ($commune->agences()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette commune a des agences rattachées.',
            ], 409);
        }

        $commune->delete();

        return response()->json([
            'success' => true,
            'message' => 'Commune supprimée.',
        ]);
    }
}