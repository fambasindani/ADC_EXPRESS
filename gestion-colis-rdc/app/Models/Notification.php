<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notifications';
    public $timestamps = false;
    protected $fillable = [
        'user_id', 'colis_id', 'canal', 'destinataire',
        'sujet', 'message', 'statut', 'date_envoi'
    ];
    protected $casts = ['date_envoi' => 'datetime', 'created_at' => 'datetime'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }

    /**
     * Crée une notification en file d'envoi (statut A_ENVOYER).
     */
    public static function creer(
        ?int $userId,
        ?int $colisId,
        string $canal,
        string $message,
        ?string $sujet = null,
        ?string $destinataire = null,
    ): self {
        return static::create([
            'user_id'      => $userId,
            'colis_id'     => $colisId,
            'canal'        => $canal,
            'destinataire' => $destinataire,
            'sujet'        => $sujet,
            'message'      => $message,
            'statut'       => 'A_ENVOYER',
        ]);
    }
}