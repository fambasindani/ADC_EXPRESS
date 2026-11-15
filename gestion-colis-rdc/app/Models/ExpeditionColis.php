<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpeditionColis extends Model
{
    protected $table = 'expedition_colis';
    public $timestamps = false;
    public $incrementing = false;
    protected $primaryKey = null;
    protected $fillable = ['expedition_id', 'colis_id', 'date_chargement', 'date_dechargement'];
    protected $casts = [
        'date_chargement' => 'datetime',
        'date_dechargement' => 'datetime',
    ];

    public function expedition(): BelongsTo { return $this->belongsTo(Expedition::class); }
    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
}