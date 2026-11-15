<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreuveLivraison extends Model
{
    protected $table = 'preuves_livraison';
    public $timestamps = false;
    protected $fillable = [
        'livraison_id', 'nom_receptionnaire', 'telephone_receptionnaire',
        'signature_path', 'photo_path', 'code_otp_verifie', 'date_preuve'
    ];
    protected $casts = ['code_otp_verifie' => 'boolean', 'date_preuve' => 'datetime'];

    public function livraison(): BelongsTo { return $this->belongsTo(Livraison::class); }
}