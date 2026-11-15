<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tarif extends Model
{
    protected $table = 'tarifs';
    public $timestamps = false;
    protected $fillable = [
        'agence_origine_id', 'agence_destination_id', 'service_id',
        'devise_code', 'prix_base', 'prix_kg', 'frais_supplementaires',
        'poids_min', 'poids_max', 'date_debut', 'date_fin', 'actif'
    ];
    protected $casts = [
        'prix_base' => 'decimal:2',
        'prix_kg' => 'decimal:2',
        'frais_supplementaires' => 'decimal:2',
        'poids_min' => 'decimal:3',
        'poids_max' => 'decimal:3',
        'date_debut' => 'date',
        'date_fin' => 'date',
        'actif' => 'boolean',
        'created_at' => 'datetime',
    ];

    public function agenceOrigine(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_origine_id'); }
    public function agenceDestination(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_destination_id'); }
    public function service(): BelongsTo { return $this->belongsTo(ServiceTransport::class, 'service_id'); }
    public function devise(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_code', 'code'); }
}