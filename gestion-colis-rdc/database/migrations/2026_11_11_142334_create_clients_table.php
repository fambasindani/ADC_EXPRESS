<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('code_client', 30)->unique();
            $table->enum('type_client', ['PERSONNE_PHYSIQUE', 'ENTREPRISE'])->default('PERSONNE_PHYSIQUE');
            $table->string('nom_ou_raison_sociale', 180);
            $table->string('postnom', 100)->nullable();
            $table->string('prenom', 100)->nullable();
            $table->string('telephone', 30);
            $table->string('telephone_secondaire', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('adresse', 255)->nullable();
            $table->foreignId('ville_id')->nullable()->constrained('villes');
            $table->string('piece_identite_type', 60)->nullable();
            $table->string('piece_identite_numero', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('telephone', 'idx_client_telephone');
            $table->index('nom_ou_raison_sociale', 'idx_client_nom');
            $table->index('email', 'idx_client_email');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
