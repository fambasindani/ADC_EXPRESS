<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistoriqueColis extends Model
{
    protected $table = 'historique_colis';
    public $timestamps = false;
    protected $fillable = [
        'colis_id', 'agence_id', 'user_id',
        'ancien_statut', 'nouveau_statut', 'commentaire', 'date_evenement'
    ];
    protected $casts = ['date_evenement' => 'datetime'];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function agence(): BelongsTo { return $this->belongsTo(Agence::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}