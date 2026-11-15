<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServiceTransport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ServiceTransportController extends Controller
{
    public function index(Request $request)
    {
        $query = ServiceTransport::withCount('colis');

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(fn($q) => $q->where('code', 'like', "%{$s}%")->orWhere('libelle', 'like', "%{$s}%"));
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
            'code'                  => 'required|string|max:40|unique:services_transport,code',
            'libelle'               => 'required|string|max:100',
            'delai_indicatif_jours' => 'nullable|integer|min:0|max:365',
            'description'           => 'nullable|string|max:255',
            'actif'                 => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $service = ServiceTransport::create([
            'code'                  => strtoupper($request->code),
            'libelle'               => $request->libelle,
            'delai_indicatif_jours' => $request->delai_indicatif_jours,
            'description'           => $request->description,
            'actif'                 => $request->input('actif', true),
        ]);

        return response()->json(['success' => true, 'message' => 'Service créé.', 'data' => $service], 201);
    }

    public function show($id)
    {
        return response()->json([
            'success' => true,
            'data'    => ServiceTransport::withCount('colis')->findOrFail($id),
        ]);
    }

    public function update(Request $request, $id)
    {
        $service = ServiceTransport::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'                  => ['sometimes', 'required', 'string', 'max:40', Rule::unique('services_transport', 'code')->ignore($service->id)],
            'libelle'               => 'sometimes|required|string|max:100',
            'delai_indicatif_jours' => 'nullable|integer|min:0|max:365',
            'description'           => 'nullable|string|max:255',
            'actif'                 => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only(['code', 'libelle', 'delai_indicatif_jours', 'description', 'actif']);
        if (isset($data['code'])) $data['code'] = strtoupper($data['code']);
        $service->update($data);

        return response()->json(['success' => true, 'message' => 'Service mis à jour.', 'data' => $service->fresh()]);
    }

    public function destroy($id)
    {
        $service = ServiceTransport::findOrFail($id);

        if ($service->colis()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : ce service est utilisé par des colis.',
            ], 409);
        }

        if ($service->tarifs()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer : ce service a des tarifs associés.',
            ], 409);
        }

        $service->delete();
        return response()->json(['success' => true, 'message' => 'Service supprimé.']);
    }
}