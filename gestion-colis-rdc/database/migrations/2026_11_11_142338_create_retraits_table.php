<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('retraits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('colis_id');
            $table->unique('colis_id', 'uq_retrait_colis');
            $table->foreignId('agence_id')->constrained('agences');
            $table->string('retire_par_nom', 180);
            $table->string('retire_par_telephone', 30);
            $table->string('type_identite', 60)->nullable();
            $table->string('numero_identite', 100)->nullable();
            $table->string('lien_avec_destinataire', 80)->nullable();
            $table->dateTime('date_retrait')->useCurrent();
            $table->foreignId('agent_id')->constrained('users');
            $table->string('signature_path', 255)->nullable();
            $table->string('preuve_path', 255)->nullable();
            $table->text('observations')->nullable();
            $table->index(['agence_id', 'date_retrait'], 'idx_retrait_agence_date');
            $table->index('agent_id', 'idx_retrait_agent');
            $table->index('date_retrait', 'idx_retrait_date');
            $table->foreign('colis_id')->references('id')->on('colis');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('retraits');
    }
};
