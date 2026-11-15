<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Non authentifié.',
            ], 401);
        }

        if ($user->statut !== 'ACTIF') {
            return response()->json([
                'success' => false,
                'message' => 'Compte inactif ou bloqué.',
            ], 403);
        }

        if (! $user->hasPermission($permission)) {
            return response()->json([
                'success' => false,
                'message' => "Permission requise : {$permission}",
            ], 403);
        }

        return $next($request);
    }
}