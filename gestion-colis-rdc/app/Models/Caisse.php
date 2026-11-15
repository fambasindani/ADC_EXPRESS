<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Caisse extends Model
{
    protected $table = 'caisses';
    public $timestamps = false;
    protected $fillable = ['agence_id', 'code', 'libelle', 'devise_code', 'solde_initial', 'actif'];
    protected $casts = ['solde_initial' => 'decimal:2', 'actif' => 'boolean'];

    public function agence(): BelongsTo { return $this->belongsTo(Agence::class); }
    public function devise(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_code', 'code'); }
    public function paiements(): HasMany { return $this->hasMany(Paiement::class); }
}