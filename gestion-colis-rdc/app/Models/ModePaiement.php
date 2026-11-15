<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModePaiement extends Model
{
    protected $table = 'modes_paiement';
    public $timestamps = false;
    protected $fillable = ['code', 'libelle', 'categorie', 'operateur', 'actif'];
    protected $casts = ['actif' => 'boolean'];

    public function paiements(): HasMany { return $this->hasMany(Paiement::class); }
}