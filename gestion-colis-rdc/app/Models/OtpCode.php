<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;

class OtpCode extends Model
{
    protected $table = 'otp_codes';
    public $timestamps = false;
    protected $fillable = ['colis_id', 'telephone', 'code_hash', 'usage_otp', 'expire_at', 'utilise'];
    protected $casts = ['expire_at' => 'datetime', 'utilise' => 'boolean', 'created_at' => 'datetime'];
    protected $hidden = ['code_hash'];

    public function colis(): BelongsTo { return $this->belongsTo(Colis::class); }

    /**
     * Vérifie et consomme un OTP (usage unique, expiré après expire_at).
     */
    public static function verifier(int $colisId, string $usage, string $code): bool
    {
        $otp = static::where('colis_id', $colisId)
            ->where('usage_otp', $usage)
            ->where('utilise', false)
            ->where('expire_at', '>', now())
            ->latest('id')
            ->first();

        if (! $otp || ! Hash::check($code, $otp->code_hash)) {
            return false;
        }

        $otp->update(['utilise' => true]);

        return true;
    }
}