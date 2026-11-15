<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $table = 'clients';
    public $timestamps = false;
    protected $fillable = [
        'code_client', 'type_client', 'nom_ou_raison_sociale',
        'postnom', 'prenom', 'telephone', 'telephone_secondaire',
        'email', 'adresse', 'ville_id',
        'piece_identite_type', 'piece_identite_numero'
    ];
    protected $casts = ['created_at' => 'datetime'];

    public function ville(): BelongsTo { return $this->belongsTo(Ville::class); }
    public function colis(): HasMany { return $this->hasMany(Colis::class, 'client_expediteur_id'); }
    

    public function getNomCompletAttribute(): string
    {
        return $this->type_client === 'ENTREPRISE'
            ? $this->nom_ou_raison_sociale
            : trim("{$this->nom_ou_raison_sociale} {$this->postnom} {$this->prenom}");
    }
}