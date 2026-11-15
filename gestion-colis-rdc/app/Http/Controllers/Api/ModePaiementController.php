<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ModePaiement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ModePaiementController extends Controller
{
    public function index(Request $request)
    {
        $query = ModePaiement::withCount('paiements');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q->where('code', 'like', "%{$s}%")->orWhere('libelle', 'like', "%{$s}%"));
        }
        if ($request->filled('categorie')) {
            $query->where('categorie', $request->categorie);
        }
        if ($request->filled('actif')) {
            $query->where('actif', filter_var($request->actif, FILTER_VALIDATE_BOOLEAN));
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderBy('categorie')->orderBy('libelle')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'      => 'required|string|max:40|unique:modes_paiement,code',
            'libelle'   => 'required|string|max:100',
            'categorie' => ['required', Rule::in(['ESPECES', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'AUTRE'])],
            'operateur' => 'nullable|string|max:80',
            'actif'     => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $mode = ModePaiement::create([
            'code'      => strtoupper($request->code),
            'libelle'   => $request->libelle,
            'categorie' => $request->categorie,
            'operateur' => $request->operateur,
            'actif'     => $request->input('actif', true),
        ]);

        return response()->json(['success' => true, 'message' => 'Mode de paiement créé.', 'data' => $mode], 201);
    }

    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data'    => ModePaiement::withCount('paiements')->findOrFail($id),
        ]);
    }

    public function update(Request $request, $id)
    {
        $mode = ModePaiement::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'      => ['sometimes', 'required', 'string', 'max:40', Rule::unique('modes_paiement', 'code')->ignore($mode->id)],
            'libelle'   => 'sometimes|required|string|max:100',
            'categorie' => ['nullable', Rule::in(['ESPECES', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'AUTRE'])],
            'operateur' => 'nullable|string|max:80',
            'actif'     => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['code', 'libelle', 'categorie', 'operateur', 'actif']);
        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $mode->update($data);

        return response()->json(['success' => true, 'message' => 'Mode mis à jour.', 'data' => $mode->fresh()]);
    }

    public function destroy($id)
    {
        $mode = ModePaiement::findOrFail($id);

        if ($mode->paiements()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : ce mode est utilisé par des paiements.',
            ], 409);
        }

        $mode->delete();
        return response()->json(['success' => true, 'message' => 'Mode supprimé.']);
    }
}