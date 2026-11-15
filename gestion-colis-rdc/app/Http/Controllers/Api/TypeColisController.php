<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TypeColis;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class TypeColisController extends Controller
{
    public function index(Request $request)
    {
        $query = TypeColis::withCount('colis');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q->where('code', 'like', "%{$s}%")->orWhere('libelle', 'like', "%{$s}%"));
        }
        if ($request->filled('fragile')) {
            $query->where('fragile', filter_var($request->fragile, FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderBy('libelle')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'        => 'required|string|max:40|unique:types_colis,code',
            'libelle'     => 'required|string|max:100',
            'description' => 'nullable|string|max:255',
            'fragile'     => 'nullable|boolean',
            'actif'       => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $type = TypeColis::create([
            'code'        => strtoupper($request->code),
            'libelle'     => $request->libelle,
            'description' => $request->description,
            'fragile'     => $request->input('fragile', false),
            'actif'       => $request->input('actif', true),
        ]);

        return response()->json(['success' => true, 'message' => 'Type de colis créé.', 'data' => $type], 201);
    }

    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data'    => TypeColis::withCount('colis')->findOrFail($id),
        ]);
    }

    public function update(Request $request, $id)
    {
        $type = TypeColis::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'        => ['sometimes', 'required', 'string', 'max:40', Rule::unique('types_colis', 'code')->ignore($type->id)],
            'libelle'     => 'sometimes|required|string|max:100',
            'description' => 'nullable|string|max:255',
            'fragile'     => 'nullable|boolean',
            'actif'       => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['code', 'libelle', 'description', 'fragile', 'actif']);
        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $type->update($data);

        return response()->json(['success' => true, 'message' => 'Type mis à jour.', 'data' => $type->fresh()]);
    }

    public function destroy($id)
    {
        $type = TypeColis::findOrFail($id);

        if ($type->colis()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : ce type est utilisé par des colis.',
            ], 409);
        }

        $type->delete();
        return response()->json(['success' => true, 'message' => 'Type supprimé.']);
    }
}