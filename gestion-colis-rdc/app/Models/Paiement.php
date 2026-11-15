<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Paiement extends Model
{
    protected $table = 'paiements';
    public $timestamps = false;
    protected $fillable = [
        'reference_paiement', 'facture_id', 'colis_id', 'agence_id', 'caisse_id',
        'mode_paiement_id', 'encaisse_par',
        'payeur_nom', 'payeur_telephone',
        'montant', 'devise_code', 'reference_externe',
        'moment_paiement', 'statut', 'date_paiement', 'observations'
    ];
    protected $casts = [
        'montant' => 'decimal:2',
        'date_paiement' => 'datetime',
    ];

    public function facture(): BelongsTo { return $this->belongsTo(Facture::class); }
    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function agence(): BelongsTo { return $this->belongsTo(Agence::class); }
    public function caisse(): BelongsTo { return $this->belongsTo(Caisse::class); }
    public function modePaiement(): BelongsTo { return $this->belongsTo(ModePaiement::class); }
    public function encaissePar(): BelongsTo { return $this->belongsTo(User::class, 'encaisse_par'); }
    public function devise(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_code', 'code'); }
    public function remboursements(): HasMany { return $this->hasMany(Remboursement::class); }
}