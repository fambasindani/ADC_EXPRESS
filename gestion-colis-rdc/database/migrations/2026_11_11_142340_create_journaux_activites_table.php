<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journaux_activites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('agence_id')->nullable()->constrained('agences');
            $table->string('action', 120);
            $table->string('table_cible', 100)->nullable();
            $table->unsignedBigInteger('id_cible')->nullable();
            $table->string('adresse_ip', 45)->nullable();
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'created_at'], 'idx_audit_user_date');
            $table->index(['table_cible', 'id_cible'], 'idx_audit_cible');
            $table->index('created_at', 'idx_audit_date');
            $table->index('action', 'idx_audit_action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journaux_activites');
    }
};
