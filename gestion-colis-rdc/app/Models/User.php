<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;                          // ← AJOUT
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;              // ← HasApiTokens AJOUTÉ

    protected $table = 'users';

    protected $fillable = [
        'agence_id', 'nom', 'postnom', 'prenom',
        'email', 'telephone', 'password_hash', 'statut', 'derniere_connexion'
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'derniere_connexion' => 'datetime',
    ];

    /**
     * Laravel utilise `password` par défaut. On redirige vers `password_hash`.
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    // --- Relations ---
    public function agence(): BelongsTo { return $this->belongsTo(Agence::class); }

    public function userRoles(): HasMany { return $this->hasMany(UserRole::class); }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles', 'user_id', 'role_id')
                    ->withPivot('agence_id', 'created_at');
    }

    public function colisCrees(): HasMany { return $this->hasMany(Colis::class, 'created_by'); }
    public function paiementsEncaisse(): HasMany { return $this->hasMany(Paiement::class, 'encaisse_par'); }
    public function retraits(): HasMany { return $this->hasMany(Retrait::class, 'agent_id'); }
    public function livraisons(): HasMany { return $this->hasMany(Livraison::class, 'livreur_id'); }
    public function notifications(): HasMany { return $this->hasMany(Notification::class); }
    public function journaux(): HasMany { return $this->hasMany(JournalActivite::class); }

    // --- Helpers métier ---
    public function hasPermission(string $permissionCode): bool
    {
        return $this->roles()
            ->whereHas('permissions', fn($q) => $q->where('code', $permissionCode))
            ->exists();
    }

    public function hasRole(string $roleCode): bool
    {
        return $this->roles()->where('code', $roleCode)->exists();
    }

    public function getNomCompletAttribute(): string
    {
        return trim("{$this->nom} {$this->postnom} {$this->prenom}");
    }
}