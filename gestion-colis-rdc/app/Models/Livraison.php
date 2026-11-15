<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Livraison extends Model
{
    protected $table = 'livraisons';
    public $timestamps = false;
    protected $fillable = [
        'colis_id', 'livreur_id', 'adresse_livraison',
        'date_affectation', 'date_tentative', 'date_livraison',
        'statut', 'motif_echec', 'frais_livraison', 'devise_code'
    ];
    protected $casts = [
        'date_affectation' => 'datetime',
        'date_tentative' => 'datetime',
        'date_livraison' => 'datetime',
        'frais_livraison' => 'decimal:2',
    ];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function livreur(): BelongsTo { return $this->belongsTo(User::class, 'livreur_id'); }
    public function devise(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_code', 'code'); }
    public function preuve(): HasOne { return $this->hasOne(PreuveLivraison::class); }
}