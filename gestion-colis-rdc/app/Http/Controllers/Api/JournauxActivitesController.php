<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalActivite;
use Illuminate\Http\Request;

class JournauxActivitesController extends Controller
{
    /**
     * GET /api/journaux-activites
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = JournalActivite::with(['user:id,nom,prenom', 'agence:id,code,nom']);

        // Restriction par agence (sauf SUPER_ADMIN / ADMIN)
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where('agence_id', $user->agence_id);
        }

        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('action', 'like', "%{$s}%")
                  ->orWhere('table_cible', 'like', "%{$s}%");
            });
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
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
