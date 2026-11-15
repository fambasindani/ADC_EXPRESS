<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historique_colis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('colis_id')->constrained('colis');
            $table->foreignId('agence_id')->nullable()->constrained('agences');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->string('ancien_statut', 40)->nullable();
            $table->string('nouveau_statut', 40);
            $table->string('commentaire', 500)->nullable();
            $table->dateTime('date_evenement')->useCurrent();
            $table->index(['colis_id', 'date_evenement'], 'idx_historique_colis_date');
            $table->index('nouveau_statut', 'idx_historique_statut');
            $table->index(['agence_id', 'date_evenement'], 'idx_historique_agence_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historique_colis');
    }
};
