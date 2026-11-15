<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Expedition extends Model
{
    protected $table = 'expeditions';
    public $timestamps = false;
    protected $fillable = [
        'reference', 'agence_depart_id', 'agence_arrivee_id',
        'mode_transport', 'transporteur', 'numero_moyen_transport',
        'chauffeur_nom', 'chauffeur_telephone',
        'date_depart', 'date_arrivee_prevue', 'date_arrivee_reelle',
        'statut', 'cree_par'
    ];
    protected $casts = [
        'date_depart' => 'datetime',
        'date_arrivee_prevue' => 'datetime',
        'date_arrivee_reelle' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function agenceDepart(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_depart_id'); }
    public function agenceArrivee(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_arrivee_id'); }
    public function createur(): BelongsTo { return $this->belongsTo(User::class, 'cree_par'); }
    public function colis(): BelongsToMany
    {
        return $this->belongsToMany(Colis::class, 'expedition_colis')
                    ->withPivot('date_chargement', 'date_dechargement');
    }
    public function transferts(): HasMany { return $this->hasMany(TransfertColis::class); }
}