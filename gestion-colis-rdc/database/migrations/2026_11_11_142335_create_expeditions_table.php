<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expeditions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 40)->unique();
            $table->foreignId('agence_depart_id')->constrained('agences');
            $table->foreignId('agence_arrivee_id')->constrained('agences');
            $table->enum('mode_transport', ['ROUTE', 'AERIEN', 'FERROVIAIRE', 'FLUVIAL', 'AUTRE'])->default('ROUTE');
            $table->string('transporteur', 150)->nullable();
            $table->string('numero_moyen_transport', 80)->nullable();
            $table->string('chauffeur_nom', 150)->nullable();
            $table->string('chauffeur_telephone', 30)->nullable();
            $table->dateTime('date_depart')->nullable();
            $table->dateTime('date_arrivee_prevue')->nullable();
            $table->dateTime('date_arrivee_reelle')->nullable();
            $table->enum('statut', ['PLANIFIEE', 'EN_COURS', 'ARRIVEE', 'ANNULEE'])->default('PLANIFIEE');
            $table->foreignId('cree_par')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
            $table->index('statut', 'idx_expedition_statut');
            $table->index(['agence_depart_id', 'agence_arrivee_id', 'date_depart'], 'idx_expedition_agences_date');
            $table->index(['date_depart', 'date_arrivee_prevue'], 'idx_expedition_dates');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expeditions');
    }
};
