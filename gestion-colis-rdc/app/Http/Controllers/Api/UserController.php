<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * GET /api/users
     * Query params acceptés :
     *   - search      : recherche texte (nom, postnom, prenom, email, telephone)
     *   - statut      : ACTIF | INACTIF | BLOQUE
     *   - agence_id   : filtre par agence
     *   - role_id     : filtre par rôle
     *   - sort_by     : nom | email | created_at | derniere_connexion (défaut: created_at)
     *   - sort_dir    : asc | desc (défaut: desc)
     *   - per_page    : 5..100 (défaut: 15)
     *   - page        : numéro de page (défaut: 1)
     */
    public function index(Request $request)
    {
        $query = User::with(['agence', 'roles']);

        // 🔍 Recherche full-text
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('nom', 'like', "%{$s}%")
                  ->orWhere('postnom', 'like', "%{$s}%")
                  ->orWhere('prenom', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%")
                  ->orWhere('telephone', 'like', "%{$s}%");
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut') && in_array($request->statut, ['ACTIF', 'INACTIF', 'BLOQUE'])) {
            $query->where('statut', $request->statut);
        }

        if ($request->filled('agence_id')) {
            $query->where('agence_id', $request->agence_id);
        }

        if ($request->filled('role_id')) {
            $query->whereHas('roles', fn ($q) => $q->where('roles.id', $request->role_id));
        }

        // 📊 Tri
        $allowedSorts = ['nom', 'email', 'created_at', 'derniere_connexion', 'statut'];
        $sortBy = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'created_at';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $users = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $users->items(),
            'meta'    => [
                'current_page' => $users->currentPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
                'last_page'    => $users->lastPage(),
                'from'         => $users->firstItem(),
                'to'           => $users->lastItem(),
            ],
        ]);
    }

    /** POST /api/users */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nom'       => 'required|string|max:100',
            'postnom'   => 'nullable|string|max:100',
            'prenom'    => 'nullable|string|max:100',
            'email'     => 'required|email|max:150|unique:users,email',
            'telephone' => 'nullable|string|max:30',
            'password'  => 'required|string|min:6',
            'statut'    => ['nullable', Rule::in(['ACTIF', 'INACTIF', 'BLOQUE'])],
            'agence_id' => 'nullable|exists:agences,id',
            'role_id'   => 'required|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $user = DB::transaction(function () use ($request) {
                $u = User::create([
                    'nom'           => $request->nom,
                    'postnom'       => $request->postnom,
                    'prenom'        => $request->prenom,
                    'email'         => $request->email,
                    'telephone'     => $request->telephone,
                    'password_hash' => Hash::make($request->password),
                    'statut'        => $request->input('statut', 'ACTIF'),
                    'agence_id'     => $request->agence_id,
                ]);

                DB::table('user_roles')->insert([
                    'user_id'   => $u->id,
                    'role_id'   => $request->role_id,
                    'agence_id' => $request->agence_id,
                ]);

                return $u;
            });

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur créé avec succès.',
                'data'    => $user->load('agence', 'roles'),
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création : ' . $e->getMessage(),
            ], 500);
        }
    }

    /** GET /api/users/{id} */
    public function show($id)
    {
        $user = User::with('agence', 'roles.permissions')->findOrFail($id);
        return response()->json(['success' => true, 'data' => $user]);
    }

    /** PUT /api/users/{id} */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nom'       => 'sometimes|required|string|max:100',
            'postnom'   => 'nullable|string|max:100',
            'prenom'    => 'nullable|string|max:100',
            'email'     => ['sometimes', 'required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'telephone' => 'nullable|string|max:30',
            'password'  => 'nullable|string|min:6',
            'statut'    => ['nullable', Rule::in(['ACTIF', 'INACTIF', 'BLOQUE'])],
            'agence_id' => 'nullable|exists:agences,id',
            'role_id'   => 'nullable|exists:roles,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            DB::transaction(function () use ($request, $user) {
                $data = $request->only(['nom', 'postnom', 'prenom', 'email', 'telephone', 'statut', 'agence_id']);
                if ($request->filled('password')) {
                    $data['password_hash'] = Hash::make($request->password);
                }
                $user->update($data);

                if ($request->filled('role_id')) {
                    DB::table('user_roles')->where('user_id', $user->id)->delete();
                    DB::table('user_roles')->insert([
                        'user_id'   => $user->id,
                        'role_id'   => $request->role_id,
                        'agence_id' => $request->agence_id ?? $user->agence_id,
                    ]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Utilisateur mis à jour.',
                'data'    => $user->fresh()->load('agence', 'roles'),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /** DELETE /api/users/{id} */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de désactiver votre propre compte.',
            ], 403);
        }

        $user->update(['statut' => 'INACTIF']);

        return response()->json(['success' => true, 'message' => 'Utilisateur désactivé.']);
    }

    /** POST /api/users/{id}/assign-role */
    public function assignRole(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'role_id'   => 'required|exists:roles,id',
            'agence_id' => 'nullable|exists:agences,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $user = User::findOrFail($id);

        DB::table('user_roles')->where('user_id', $user->id)->delete();
        DB::table('user_roles')->insert([
            'user_id'   => $user->id,
            'role_id'   => $request->role_id,
            'agence_id' => $request->agence_id ?? $user->agence_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rôle assigné avec succès.',
            'data'    => $user->fresh()->load('roles'),
        ]);
    }

    /** GET /api/users/form-data */
    public function formData()
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'agences' => Agence::where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
                'roles'   => Role::where('actif', true)->orderBy('nom')->get(['id', 'code', 'nom']),
                'statuts' => ['ACTIF', 'INACTIF', 'BLOQUE'],
            ],
        ]);
    }
}