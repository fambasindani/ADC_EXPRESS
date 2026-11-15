<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agence_id')->nullable()->constrained('agences');
            $table->string('nom', 100);
            $table->string('postnom', 100)->nullable();
            $table->string('prenom', 100)->nullable();
            $table->string('email', 150)->unique();
            $table->string('telephone', 30)->nullable();
            $table->string('password_hash', 255);
            $table->enum('statut', ['ACTIF', 'INACTIF', 'BLOQUE'])->default('ACTIF');
            $table->dateTime('derniere_connexion')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('statut', 'idx_user_statut');
            $table->index('telephone', 'idx_user_telephone');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
