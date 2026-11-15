<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    protected $table = 'role_permissions';
    public $timestamps = false;
    protected $fillable = ['role_id', 'permission_id'];
    // Note : clé primaire composite, pas d'id auto-increment
    public $incrementing = false;
    protected $primaryKey = null;
}