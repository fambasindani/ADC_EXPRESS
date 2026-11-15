<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Commune extends Model
{
    protected $table = 'communes';
    public $timestamps = false;
    protected $fillable = ['ville_id', 'nom', 'actif'];
    protected $casts = ['actif' => 'boolean'];

    public function ville(): BelongsTo { return $this->belongsTo(Ville::class); }
    public function agences(): HasMany { return $this->hasMany(Agence::class); }
}