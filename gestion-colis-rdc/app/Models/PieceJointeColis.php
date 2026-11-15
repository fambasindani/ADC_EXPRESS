<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PieceJointeColis extends Model
{
    protected $table = 'pieces_jointes_colis';
    public $timestamps = false;
    protected $fillable = [
        'colis_id', 'type_piece', 'nom_fichier', 'chemin_fichier',
        'mime_type', 'taille_octets', 'ajoute_par'
    ];
    protected $casts = ['created_at' => 'datetime'];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }
    public function ajoutePar(): BelongsTo { return $this->belongsTo(User::class, 'ajoute_par'); }
}