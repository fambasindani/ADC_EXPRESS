<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sequence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SequenceController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data'    => Sequence::orderBy('nom')->get(),
        ]);
    }

    public function show($nom)
    {
        return response()->json([
            'success' => true,
            'data'    => Sequence::findOrFail($nom),
        ]);
    }

    /**
     * POST /api/sequences/{nom}/reset
     * Réinitialise le compteur à 0 (admin uniquement).
     */
    public function reset($nom)
    {
        $seq = Sequence::findOrFail($nom);
        $seq->update(['dernier_numero' => 0]);

        return response()->json([
            'success' => true,
            'message' => "Séquence '{$nom}' réinitialisée.",
            'data'    => $seq->fresh(),
        ]);
    }

    /**
     * POST /api/sequences/{nom}/next
     * Génère le prochain numéro (utile pour tests).
     */
    public function next($nom)
    {
        return response()->json([
            'success' => true,
            'data'    => ['numero' => Sequence::next($nom)],
        ]);
    }
}