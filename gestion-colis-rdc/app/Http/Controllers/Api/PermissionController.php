<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * GET /api/permissions
     *
     * Query params acceptés :
     *   - search : recherche texte (code ou nom)
     *   - module : filtre par module (colis, finance, utilisateurs, ...)
     *
     * Retourne :
     *   - data    : liste plate de toutes les permissions (après filtres)
     *   - grouped : permissions regroupées par module (pour l'UI)
     *   - modules : liste unique des modules (pour un dropdown)
     */
    public function index(Request $request)
    {
        $query = Permission::query();

        // 🔍 Recherche texte
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('nom', 'like', "%{$s}%");
            });
        }

        // 🎯 Filtre par module
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }

        $permissions = $query->orderBy('module')
                             ->orderBy('code')
                             ->get();

        // Groupement par module pour faciliter l'affichage frontend
        $grouped = $permissions->groupBy('module')->map(function ($items, $module) {
            return [
                'module'      => $module,
                'total'       => $items->count(),
                'permissions' => $items->values(),
            ];
        })->values();

        // Liste unique des modules (utile pour un dropdown)
        $modules = $permissions->pluck('module')->unique()->values();

        return response()->json([
            'success' => true,
            'data'    => $permissions,
            'grouped' => $grouped,
            'modules' => $modules,
            'meta'    => [
                'total'      => $permissions->count(),
                'modules'    => $modules->count(),
            ],
        ]);
    }

    /**
     * GET /api/permissions/{id}
     *
     * Retourne la permission + les rôles qui la possèdent.
     */
    public function show($id)
    {
        $permission = Permission::with('roles')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => $permission,
        ]);
    }
}