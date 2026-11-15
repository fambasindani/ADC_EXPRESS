<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modes_paiement', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('libelle', 100);
            $table->enum('categorie', ['ESPECES', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'AUTRE']);
            $table->string('operateur', 80)->nullable();
            $table->boolean('actif')->default(true);
            $table->index('categorie', 'idx_mode_paiement_categorie');
            $table->index('actif', 'idx_mode_paiement_actif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modes_paiement');
    }
};
