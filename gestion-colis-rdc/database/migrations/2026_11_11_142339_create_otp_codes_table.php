<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('colis_id')->constrained('colis');
            $table->string('telephone', 30);
            $table->string('code_hash', 255);
            $table->enum('usage_otp', ['RETRAIT', 'LIVRAISON', 'SUIVI']);
            $table->dateTime('expire_at');
            $table->boolean('utilise')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['colis_id', 'usage_otp'], 'idx_otp_colis_usage');
            $table->index('expire_at', 'idx_otp_expire');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};
