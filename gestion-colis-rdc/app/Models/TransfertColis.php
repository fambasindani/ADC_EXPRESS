<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransfertColis extends Model
{
    protected $table = 'transferts_colis';
    public $timestamps = false;
    protected $fillable = [
        'colis_id', 'agence_depart_id', 'agence_arrivee_id', 'expedition_id',
        'date_transfert', 'date_reception', 'remis_par', 'recu_par',
        'statut', 'observations'
    ];
    protected $casts = [
        'date_transfert' => 'datetime',
        'date_reception' => 'datetime',
    ];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function agenceDepart(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_depart_id'); }
    public function agenceArrivee(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_arrivee_id'); }
    public function expedition(): BelongsTo { return $this->belongsTo(Expedition::class); }
    public function remisPar(): BelongsTo { return $this->belongsTo(User::class, 'remis_par'); }
    public function recuPar(): BelongsTo { return $this->belongsTo(User::class, 'recu_par'); }
}