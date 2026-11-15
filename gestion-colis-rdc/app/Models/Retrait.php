<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Retrait extends Model
{
    protected $table = 'retraits';
    public $timestamps = false;
    protected $fillable = [
        'colis_id', 'agence_id', 'retire_par_nom', 'retire_par_telephone',
        'type_identite', 'numero_identite', 'lien_avec_destinataire',
        'date_retrait', 'agent_id', 'signature_path', 'preuve_path', 'observations'
    ];
    protected $casts = ['date_retrait' => 'datetime'];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function agence(): BelongsTo { return $this->belongsTo(Agence::class); }
    public function agent(): BelongsTo { return $this->belongsTo(User::class, 'agent_id'); }
}