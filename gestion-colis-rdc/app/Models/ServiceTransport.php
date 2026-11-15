<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceTransport extends Model
{
    protected $table = 'services_transport';
    public $timestamps = false;
    protected $fillable = ['code', 'libelle', 'delai_indicatif_jours', 'description', 'actif'];
    protected $casts = ['actif' => 'boolean'];

    public function colis(): HasMany { return $this->hasMany(Colis::class, 'service_id'); }
    public function tarifs(): HasMany { return $this->hasMany(Tarif::class, 'service_id'); }
}