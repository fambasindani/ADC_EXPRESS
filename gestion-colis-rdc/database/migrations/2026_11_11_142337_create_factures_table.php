<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factures', function (Blueprint $table) {
            $table->id();
            $table->string('numero_facture', 40)->unique();
            $table->foreignId('colis_id');
            $table->unique('colis_id', 'uq_facture_colis');
            $table->decimal('montant_total', 15, 2);
            $table->char('devise_code', 3);
            $table->dateTime('date_facture')->useCurrent();
            $table->enum('statut', ['BROUILLON', 'EN_ATTENTE', 'PARTIELLE', 'PAYEE', 'ANNULEE', 'REMBOURSEE'])->default('EN_ATTENTE');
            $table->foreignId('cree_par')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
            $table->index('statut', 'idx_facture_statut');
            $table->index('date_facture', 'idx_facture_date');
            $table->index('devise_code', 'idx_facture_devise');
            $table->foreign('colis_id')->references('id')->on('colis');
            $table->foreign('devise_code')->references('code')->on('devises');
        });

        DB::statement('ALTER TABLE factures ADD CONSTRAINT chk_facture_montant CHECK (montant_total >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('factures');
    }
};
