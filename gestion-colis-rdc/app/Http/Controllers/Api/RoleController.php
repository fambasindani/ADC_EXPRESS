<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * GET /api/roles
     */
    public function index(Request $request)
    {
        $query = Role::with('permissions');

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

        $roles = $query->orderBy('nom')->get();

        return response()->json([
            'success' => true,
            'data'    => $roles,
        ]);
    }

    /**
     * POST /api/roles
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'          => 'required|string|max:60|unique:roles,code',
            'nom'           => 'required|string|max:100',
            'description'   => 'nullable|string|max:255',
            'actif'         => 'nullable|boolean',
            'permissions'   => 'array',
            'permissions.*' => 'integer|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $role = DB::transaction(function () use ($request) {
                $r = Role::create([
                    'code'        => $request->code,
                    'nom'         => $request->nom,
                    'description' => $request->description,
                    'actif'       => $request->input('actif', true),
                ]);

                if ($request->filled('permissions')) {
                    foreach ($request->permissions as $pid) {
                        DB::table('role_permissions')->insert([
                            'role_id'       => $r->id,
                            'permission_id' => $pid,
                        ]);
                    }
                }

                return $r;
            });

            return response()->json([
                'success' => true,
                'message' => 'Rôle créé avec succès.',
                'data'    => $role->load('permissions'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/roles/{id}
     */
    public function show($id)
    {
        $role = Role::with('permissions')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $role]);
    }

    /**
     * PUT /api/roles/{id}
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'        => ['sometimes', 'required', 'string', 'max:60', Rule::unique('roles', 'code')->ignore($role->id)],
            'nom'         => 'sometimes|required|string|max:100',
            'description' => 'nullable|string|max:255',
            'actif'       => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $role->update($request->only(['code', 'nom', 'description', 'actif']));

        return response()->json([
            'success' => true,
            'message' => 'Rôle mis à jour.',
            'data'    => $role->fresh()->load('permissions'),
        ]);
    }

    /**
     * DELETE /api/roles/{id}
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->code === 'SUPER_ADMIN') {
            return response()->json([
                'success' => false,
                'message' => 'Le rôle SUPER_ADMIN ne peut pas être supprimé.',
            ], 403);
        }

        DB::transaction(function () use ($role) {
            DB::table('role_permissions')->where('role_id', $role->id)->delete();
            DB::table('user_roles')->where('role_id', $role->id)->delete();
            $role->delete();
        });

        return response()->json(['success' => true, 'message' => 'Rôle supprimé.']);
    }

    /**
     * PUT /api/roles/{id}/permissions
     * Remplace toutes les permissions du rôle.
     */
    public function syncPermissions(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'permissions'   => 'required|array',
            'permissions.*' => 'integer|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $role = Role::findOrFail($id);

        DB::transaction(function () use ($request, $role) {
            DB::table('role_permissions')->where('role_id', $role->id)->delete();
            foreach ($request->permissions as $pid) {
                DB::table('role_permissions')->insert([
                    'role_id'       => $role->id,
                    'permission_id' => $pid,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Permissions synchronisées.',
            'data'    => $role->fresh()->load('permissions'),
        ]);
    }
}