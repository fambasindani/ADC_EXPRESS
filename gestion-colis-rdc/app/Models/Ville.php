<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ville extends Model
{
    protected $table = 'villes';
    public $timestamps = false;
    protected $fillable = ['province_id', 'nom', 'actif'];
    protected $casts = ['actif' => 'boolean'];

    public function province(): BelongsTo { return $this->belongsTo(Province::class); }
    public function communes(): HasMany { return $this->hasMany(Commune::class); }
    public function agences(): HasMany { return $this->hasMany(Agence::class); }
    public function clients(): HasMany { return $this->hasMany(Client::class); }
    public function colisDestination(): HasMany { return $this->hasMany(Colis::class, 'ville_destination_id'); }
}