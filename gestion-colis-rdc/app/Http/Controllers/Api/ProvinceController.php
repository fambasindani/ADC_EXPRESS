<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Province;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ProvinceController extends Controller
{
    /**
     * GET /api/provinces
     * Query : search, actif, sort_by, sort_dir, per_page, page
     */
    public function index(Request $request)
    {
        $query = Province::withCount('villes')->withCount('agences');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('nom', 'like', "%{$s}%");
            });
        }

        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        $allowedSorts = ['nom', 'code', 'created_at'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'nom';
        $sortDir = $request->get('sort_dir') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDir);

        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $provinces = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $provinces->items(),
            'meta'    => [
                'current_page' => $provinces->currentPage(),
                'per_page'     => $provinces->perPage(),
                'total'        => $provinces->total(),
                'last_page'    => $provinces->lastPage(),
                'from'         => $provinces->firstItem(),
                'to'           => $provinces->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/provinces
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'  => 'required|string|max:20|unique:provinces,code',
            'nom'   => 'required|string|max:120|unique:provinces,nom',
            'actif' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $province = Province::create([
            'code'  => strtoupper($request->code),
            'nom'   => $request->nom,
            'actif' => $request->input('actif', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Province créée avec succès.',
            'data'    => $province,
        ], 201);
    }

    /**
     * GET /api/provinces/{id}
     * Inclut villes et agences.
     */
    public function show($id)
    {
        $province = Province::with([
            'villes:id,province_id,nom,actif',
            'agences:id,province_id,code,nom,type_agence,actif',
        ])->withCount(['villes', 'agences'])->findOrFail($id);

        return response()->json(['success' => true, 'data' => $province]);
    }

    /**
     * PUT /api/provinces/{id}
     */
    public function update(Request $request, $id)
    {
        $province = Province::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'  => ['sometimes', 'required', 'string', 'max:20', Rule::unique('provinces', 'code')->ignore($province->id)],
            'nom'   => ['sometimes', 'required', 'string', 'max:120', Rule::unique('provinces', 'nom')->ignore($province->id)],
            'actif' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['code', 'nom', 'actif']);
        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }
        $province->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Province mise à jour.',
            'data'    => $province->fresh(),
        ]);
    }

    /**
     * DELETE /api/provinces/{id}
     * Refuse si villes ou agences rattachées.
     */
    public function destroy($id)
    {
        $province = Province::findOrFail($id);

        if ($province->villes()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette province a des villes rattachées.',
            ], 409);
        }

        if ($province->agences()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette province a des agences rattachées.',
            ], 409);
        }

        $province->delete();

        return response()->json([
            'success' => true,
            'message' => 'Province supprimée.',
        ]);
    }
}