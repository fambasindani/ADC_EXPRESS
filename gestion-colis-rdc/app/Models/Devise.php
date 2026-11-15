<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Devise extends Model
{
    protected $table = 'devises';
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = ['code', 'nom', 'symbole', 'decimales', 'actif'];
    protected $casts = ['actif' => 'boolean', 'decimales' => 'integer'];
}