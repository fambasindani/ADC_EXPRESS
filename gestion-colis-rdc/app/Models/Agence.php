<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Agence extends Model
{
    protected $table = 'agences';
    protected $fillable = [
        'code', 'nom', 'province_id', 'ville_id', 'commune_id',
        'adresse', 'telephone', 'email', 'type_agence',
        'agence_parent_id', 'actif'
    ];
    protected $casts = [
        'actif' => 'boolean',
        'type_agence' => 'string',
    ];

    public function province(): BelongsTo { return $this->belongsTo(Province::class); }
    public function ville(): BelongsTo { return $this->belongsTo(Ville::class); }
    public function commune(): BelongsTo { return $this->belongsTo(Commune::class); }
    public function parent(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_parent_id'); }
    public function enfants(): HasMany { return $this->hasMany(Agence::class, 'agence_parent_id'); }

    public function users(): HasMany { return $this->hasMany(User::class); }
    public function caisses(): HasMany { return $this->hasMany(Caisse::class); }
    public function colisDepot(): HasMany { return $this->hasMany(Colis::class, 'agence_depot_id'); }
    public function colisDestination(): HasMany { return $this->hasMany(Colis::class, 'agence_destination_id'); }
    public function expeditionsDepart(): HasMany { return $this->hasMany(Expedition::class, 'agence_depart_id'); }
    public function expeditionsArrivee(): HasMany { return $this->hasMany(Expedition::class, 'agence_arrivee_id'); }
    public function paiements(): HasMany { return $this->hasMany(Paiement::class); }
    public function retraits(): HasMany { return $this->hasMany(Retrait::class); }
    public function transfertsDepart(): HasMany { return $this->hasMany(TransfertColis::class, 'agence_depart_id'); }
    public function transfertsArrivee(): HasMany { return $this->hasMany(TransfertColis::class, 'agence_arrivee_id'); }
}