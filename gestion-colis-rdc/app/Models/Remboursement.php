<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Remboursement extends Model
{
    protected $table = 'remboursements';
    public $timestamps = false;
    protected $fillable = ['paiement_id', 'montant', 'motif', 'rembourse_par', 'date_remboursement', 'statut'];
    protected $casts = ['montant' => 'decimal:2', 'date_remboursement' => 'datetime'];

    public function paiement(): BelongsTo { return $this->belongsTo(Paiement::class); }
    public function remboursePar(): BelongsTo { return $this->belongsTo(User::class, 'rembourse_par'); }
}