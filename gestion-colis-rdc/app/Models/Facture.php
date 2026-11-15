<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facture extends Model
{
    protected $table = 'factures';
    public $timestamps = false;
    protected $fillable = [
        'numero_facture', 'colis_id', 'montant_total', 'devise_code',
        'date_facture', 'statut', 'cree_par'
    ];
    protected $casts = [
        'montant_total' => 'decimal:2',
        'date_facture' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function devise(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_code', 'code'); }
    public function createur(): BelongsTo { return $this->belongsTo(User::class, 'cree_par'); }
    public function paiements(): HasMany { return $this->hasMany(Paiement::class); }
}