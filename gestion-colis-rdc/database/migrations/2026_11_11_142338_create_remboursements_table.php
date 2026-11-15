<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remboursements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('paiement_id')->constrained('paiements');
            $table->decimal('montant', 15, 2);
            $table->string('motif', 255);
            $table->foreignId('rembourse_par')->constrained('users');
            $table->dateTime('date_remboursement')->useCurrent();
            $table->enum('statut', ['DEMANDE', 'VALIDE', 'REJETE', 'EFFECTUE'])->default('DEMANDE');
            $table->index('statut', 'idx_remboursement_statut');
            $table->index('date_remboursement', 'idx_remboursement_date');
        });

        DB::statement('ALTER TABLE remboursements ADD CONSTRAINT chk_remboursement_montant CHECK (montant > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('remboursements');
    }
};
