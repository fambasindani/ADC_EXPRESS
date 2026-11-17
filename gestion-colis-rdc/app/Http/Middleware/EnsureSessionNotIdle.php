<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ferme la session d'un utilisateur resté inactif trop longtemps.
 *
 * Le jeton Sanctum conserve la date de sa dernière utilisation. Si l'écart
 * dépasse le délai configuré (sanctum.idle_timeout), le jeton est supprimé et
 * l'API répond 401 : le frontend nettoie alors la session et renvoie au login.
 */
class EnsureSessionNotIdle
{
    public function handle(Request $request, Closure $next): Response
    {
        $minutes = (int) config('sanctum.idle_timeout', 30);

        if ($minutes <= 0 || ! $this->routeRequiresAuthentication($request)) {
            return $next($request);
        }

        $plainTextToken = $request->bearerToken();

        if (! $plainTextToken) {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($plainTextToken);

        if (
            $accessToken
            && $accessToken->last_used_at
            && $accessToken->last_used_at->lt(now()->subMinutes($minutes))
        ) {
            $accessToken->delete();

            return response()->json([
                'success' => false,
                'message' => "Session expirée après {$minutes} minutes d'inactivité. Veuillez vous reconnecter.",
            ], 401);
        }

        return $next($request);
    }

    /**
     * N'applique le contrôle qu'aux routes réellement authentifiées
     * (le login et le suivi public restent accessibles).
     */
    private function routeRequiresAuthentication(Request $request): bool
    {
        $middleware = $request->route()?->gatherMiddleware() ?? [];

        return in_array('auth:sanctum', $middleware, true);
    }
}
