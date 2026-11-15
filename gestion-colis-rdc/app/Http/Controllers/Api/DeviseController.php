<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Devise;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class DeviseController extends Controller
{
    public function index(Request $request)
    {
        $query = Devise::query();

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q->where('code', 'like', "%{$s}%")->orWhere('nom', 'like', "%{$s}%"));
        }
        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderBy('code')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'      => 'required|string|size:3|unique:devises,code',
            'nom'       => 'required|string|max:50',
            'symbole'   => 'required|string|max:10',
            'decimales' => 'nullable|integer|min:0|max:6',
            'actif'     => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $devise = Devise::create([
            'code'      => strtoupper($request->code),
            'nom'       => $request->nom,
            'symbole'   => $request->symbole,
            'decimales' => $request->input('decimales', 2),
            'actif'     => $request->input('actif', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Devise créée.',
            'data'    => $devise,
        ], 201);
    }

    public function show($code)
    {
        return response()->json([
            'success' => true,
            'data'    => Devise::findOrFail($code),
        ]);
    }

    public function update(Request $request, $code)
    {
        $devise = Devise::findOrFail($code);

        $validator = Validator::make($request->all(), [
            'nom'       => 'sometimes|required|string|max:50',
            'symbole'   => 'sometimes|required|string|max:10',
            'decimales' => 'nullable|integer|min:0|max:6',
            'actif'     => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $devise->update($request->only(['nom', 'symbole', 'decimales', 'actif']));

        return response()->json([
            'success' => true,
            'message' => 'Devise mise à jour.',
            'data'    => $devise->fresh(),
        ]);
    }

    public function destroy($code)
    {
        $devise = Devise::findOrFail($code);

        if (in_array($code, ['CDF', 'USD'])) {
            return response()->json([
                'success' => false,
                'message' => 'Les devises de base CDF et USD ne peuvent pas être supprimées.',
            ], 403);
        }

        // Vérifier si utilisée
        if (\DB::table('colis')->where('devise_paiement', $code)->orWhere('devise_valeur', $code)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : cette devise est utilisée par des colis.',
            ], 409);
        }

        $devise->delete();

        return response()->json(['success' => true, 'message' => 'Devise supprimée.']);
    }
}