<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends Model
{
    protected $table = 'provinces';
    public $timestamps = false;
    protected $fillable = ['code', 'nom', 'actif'];
    protected $casts = ['actif' => 'boolean'];

    public function villes(): HasMany { return $this->hasMany(Ville::class); }
    public function agences(): HasMany { return $this->hasMany(Agence::class); }
    
}