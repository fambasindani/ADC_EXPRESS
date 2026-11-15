<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TypeColis extends Model
{
    protected $table = 'types_colis';
    public $timestamps = false;
    protected $fillable = ['code', 'libelle', 'description', 'fragile', 'actif'];
    protected $casts = ['fragile' => 'boolean', 'actif' => 'boolean'];

    public function colis(): HasMany { return $this->hasMany(Colis::class); }
}