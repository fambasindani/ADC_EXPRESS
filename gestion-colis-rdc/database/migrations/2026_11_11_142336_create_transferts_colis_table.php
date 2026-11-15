<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transferts_colis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('colis_id')->constrained('colis');
            $table->foreignId('agence_depart_id')->constrained('agences');
            $table->foreignId('agence_arrivee_id')->constrained('agences');
            $table->foreignId('expedition_id')->nullable()->constrained('expeditions');
            $table->dateTime('date_transfert')->useCurrent();
            $table->dateTime('date_reception')->nullable();
            $table->foreignId('remis_par')->constrained('users');
            $table->foreignId('recu_par')->nullable()->constrained('users');
            $table->enum('statut', ['EN_ATTENTE', 'EXPEDIE', 'RECU', 'ANNULE'])->default('EN_ATTENTE');
            $table->text('observations')->nullable();
            $table->index('statut', 'idx_transfert_statut');
            $table->index(['date_transfert', 'date_reception'], 'idx_transfert_dates');
            $table->index(['agence_depart_id', 'agence_arrivee_id'], 'idx_transfert_agences');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferts_colis');
    }
};
