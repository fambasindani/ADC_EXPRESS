<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalActivite extends Model
{
    protected $table = 'journaux_activites';
    public $timestamps = false;
    protected $fillable = [
        'user_id', 'agence_id', 'action', 'table_cible', 'id_cible',
        'adresse_ip', 'details'
    ];
    protected $casts = ['details' => 'array', 'created_at' => 'datetime'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function agence(): BelongsTo { return $this->belongsTo(Agence::class); }

    /**
     * Enregistre une action dans le journal d'activités (audit).
     */
    public static function enregistrer(
        string $action,
        ?string $tableCible = null,
        ?int $idCible = null,
        ?array $details = null,
        $user = null,
    ): self {
        $u = $user ?? auth()->user();

        return static::create([
            'user_id'    => $u?->id,
            'agence_id'  => $u?->agence_id,
            'action'     => $action,
            'table_cible' => $tableCible,
            'id_cible'   => $idCible,
            'adresse_ip' => request()->ip(),
            'details'    => $details,
        ]);
    }
}