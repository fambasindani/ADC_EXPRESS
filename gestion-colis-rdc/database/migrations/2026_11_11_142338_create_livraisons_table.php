<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('livraisons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('colis_id')->constrained('colis');
            $table->foreignId('livreur_id')->constrained('users');
            $table->string('adresse_livraison', 255);
            $table->dateTime('date_affectation')->useCurrent();
            $table->dateTime('date_tentative')->nullable();
            $table->dateTime('date_livraison')->nullable();
            $table->enum('statut', ['A_AFFECTER', 'EN_COURS', 'LIVRE', 'ECHEC', 'REPROGRAMME'])->default('A_AFFECTER');
            $table->string('motif_echec', 255)->nullable();
            $table->decimal('frais_livraison', 15, 2)->default(0);
            $table->char('devise_code', 3);
            $table->index('statut', 'idx_livraison_statut');
            $table->index(['livreur_id', 'statut'], 'idx_livraison_livreur_statut');
            $table->index('date_affectation', 'idx_livraison_date');
            $table->foreign('devise_code')->references('code')->on('devises');
        });

        DB::statement('ALTER TABLE livraisons ADD CONSTRAINT chk_livraison_frais CHECK (frais_livraison >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('livraisons');
    }
};
