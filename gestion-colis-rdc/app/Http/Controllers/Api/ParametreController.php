<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Parametre;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ParametreController extends Controller
{
    public function index(Request $request)
    {
        $query = Parametre::query();

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q->where('cle', 'like', "%{$s}%")->orWhere('valeur', 'like', "%{$s}%"));
        }

        return response()->json([
            'success' => true,
            'data'    => $query->orderBy('cle')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cle'         => 'required|string|max:100|unique:parametres,cle',
            'valeur'      => 'nullable|string',
            'description' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $p = Parametre::create($request->only(['cle', 'valeur', 'description']));

        return response()->json(['success' => true, 'message' => 'Paramètre créé.', 'data' => $p], 201);
    }

    public function show($id)
    {
        return response()->json(['success' => true, 'data' => Parametre::findOrFail($id)]);
    }

    public function update(Request $request, $id)
    {
        $p = Parametre::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'valeur'      => 'nullable|string',
            'description' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $p->update($request->only(['valeur', 'description']));

        return response()->json(['success' => true, 'message' => 'Paramètre mis à jour.', 'data' => $p->fresh()]);
    }

    public function destroy($id)
    {
        $p = Parametre::findOrFail($id);

        // On interdit la suppression de certains paramètres critiques
        $proteges = ['pays', 'devise_defaut', 'suivi_public_actif'];
        if (in_array($p->cle, $proteges)) {
            return response()->json([
                'success' => false,
                'message' => 'Ce paramètre système est protégé et ne peut pas être supprimé.',
            ], 403);
        }

        $p->delete();
        return response()->json(['success' => true, 'message' => 'Paramètre supprimé.']);
    }

    /**
     * PUT /api/parametres/bulk
     * Mise à jour de plusieurs paramètres en une fois.
     */
    public function bulkUpdate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'parametres'   => 'required|array',
            'parametres.*.cle'    => 'required|string',
            'parametres.*.valeur' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        foreach ($request->parametres as $item) {
            Parametre::where('cle', $item['cle'])->update(['valeur' => $item['valeur'] ?? null]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Paramètres mis à jour.',
            'data'    => Parametre::orderBy('cle')->get(),
        ]);
    }
}