<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->string('reference_paiement', 50)->unique();
            $table->foreignId('facture_id')->constrained('factures');
            $table->foreignId('colis_id')->constrained('colis');
            $table->foreignId('agence_id')->constrained('agences');
            $table->foreignId('caisse_id')->nullable()->constrained('caisses');
            $table->foreignId('mode_paiement_id')->constrained('modes_paiement');
            $table->foreignId('encaisse_par')->constrained('users');
            $table->string('payeur_nom', 180)->nullable();
            $table->string('payeur_telephone', 30)->nullable();
            $table->decimal('montant', 15, 2);
            $table->char('devise_code', 3);
            $table->string('reference_externe', 120)->nullable();
            $table->enum('moment_paiement', ['DEPOT', 'RETRAIT', 'AUTRE']);
            $table->enum('statut', ['EN_ATTENTE', 'VALIDE', 'REJETE', 'ANNULE', 'REMBOURSE'])->default('VALIDE');
            $table->dateTime('date_paiement')->useCurrent();
            $table->string('observations', 500)->nullable();

            $table->index(['colis_id', 'date_paiement'], 'idx_paiement_colis');
            $table->index(['agence_id', 'date_paiement'], 'idx_paiement_agence_date');
            $table->index('statut', 'idx_paiement_statut');
            $table->index('date_paiement', 'idx_paiement_date');
            $table->index(['agence_id', 'statut', 'date_paiement'], 'idx_paiement_agence_statut_date');
            $table->index('moment_paiement', 'idx_paiement_moment');

            $table->foreign('devise_code')->references('code')->on('devises');
        });

        DB::statement('ALTER TABLE paiements ADD CONSTRAINT chk_paiement_montant CHECK (montant > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};
