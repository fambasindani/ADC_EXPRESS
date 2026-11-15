<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Notification::with(['user:id,nom,prenom', 'colis:id,numero_suivi']);

        // Les non-admins ne voient que leurs notifications / celles de leur agence
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN')) {
            if ($user->agence_id) {
                $query->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                      ->orWhereHas('colis', fn ($c) => $c
                          ->where('agence_depot_id', $user->agence_id)
                          ->orWhere('agence_destination_id', $user->agence_id));
                });
            } else {
                $query->where('user_id', $user->id);
            }
        }

        if ($request->filled('canal')) {
            $query->where('canal', $request->canal);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('sujet', 'like', "%{$s}%")
                  ->orWhere('message', 'like', "%{$s}%")
                  ->orWhereHas('colis', fn ($c) => $c->where('numero_suivi', 'like', "%{$s}%"));
            });
        }

        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }

        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $items   = $query->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $items->items(),
            'meta'    => [
                'current_page' => $items->currentPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'last_page'    => $items->lastPage(),
                'from'         => $items->firstItem(),
                'to'           => $items->lastItem(),
            ],
        ]);
    }
}
