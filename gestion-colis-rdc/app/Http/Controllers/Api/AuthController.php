<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalActivite;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string|min:4',
        ], [
            'email.required'    => "L'adresse email est requise.",
            'email.email'       => 'Veuillez saisir une adresse email valide.',
            'password.required' => 'Le mot de passe est requis.',
            'password.min'      => 'Le mot de passe doit contenir au moins 4 caractères.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Adresse email introuvable. Vérifiez votre email.',
            ], 401);
        }

        if (! Hash::check($request->password, $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe incorrect.',
            ], 401);
        }

        if ($user->statut === 'BLOQUE') {
            return response()->json([
                'success' => false,
                'message' => "Votre compte est bloqué. Contactez l'administrateur.",
            ], 403);
        }

        if ($user->statut !== 'ACTIF') {
            return response()->json([
                'success' => false,
                'message' => "Votre compte est désactivé. Contactez l'administrateur.",
            ], 403);
        }

        $user->derniere_connexion = now();
        $user->save();

        JournalActivite::enregistrer('auth.login', 'users', $user->id, null, $user);

        $token = $user->createToken('adc-express-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Connexion réussie.',
            'data'    => [
                'user'  => $this->serializeUser($user),
                'token' => $token,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Déconnexion réussie.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'user' => $this->serializeUser($request->user()),
            ],
        ]);
    }

    private function serializeUser(User $user): array
    {
        $user->load('agence', 'roles.permissions');

        $permissions = $user->roles
            ->flatMap(fn ($role) => $role->permissions->pluck('code'))
            ->unique()
            ->values();

        return [
            'id'                 => $user->id,
            'nom'                => $user->nom,
            'postnom'            => $user->postnom,
            'prenom'             => $user->prenom,
            'nom_complet'        => $user->nom_complet,
            'email'              => $user->email,
            'telephone'          => $user->telephone,
            'statut'             => $user->statut,
            'derniere_connexion' => $user->derniere_connexion,
            'agence'             => $user->agence ? [
                'id'   => $user->agence->id,
                'code' => $user->agence->code,
                'nom'  => $user->agence->nom,
                'type' => $user->agence->type_agence,
            ] : null,
            'roles'              => $user->roles->map(fn ($r) => [
                'id'   => $r->id,
                'code' => $r->code,
                'nom'  => $r->nom,
            ]),
            'permissions'        => $permissions,
        ];
    }
}