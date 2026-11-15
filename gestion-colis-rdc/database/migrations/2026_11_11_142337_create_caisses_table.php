<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caisses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agence_id')->constrained('agences');
            $table->string('code', 30);
            $table->string('libelle', 100);
            $table->char('devise_code', 3);
            $table->decimal('solde_initial', 15, 2)->default(0);
            $table->boolean('actif')->default(true);
            $table->unique(['agence_id', 'code'], 'uq_caisse_agence_code');
            $table->index('devise_code', 'idx_caisse_devise');
            $table->index('actif', 'idx_caisse_actif');
            $table->foreign('devise_code')->references('code')->on('devises');
        });

        DB::statement('ALTER TABLE caisses ADD CONSTRAINT chk_caisse_solde CHECK (solde_initial >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('caisses');
    }
};
