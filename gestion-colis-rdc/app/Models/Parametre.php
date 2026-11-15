<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Parametre extends Model
{
    protected $table = 'parametres';
    public $timestamps = false;
    protected $fillable = ['cle', 'valeur', 'description'];
    protected $casts = ['updated_at' => 'datetime'];

    public static function get(string $cle, $default = null)
    {
        return static::where('cle', $cle)->value('valeur') ?? $default;
    }
}