<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pieces_jointes_colis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('colis_id')->constrained('colis');
            $table->string('type_piece', 60);
            $table->string('nom_fichier', 255);
            $table->string('chemin_fichier', 500);
            $table->string('mime_type', 120)->nullable();
            $table->unsignedBigInteger('taille_octets')->nullable();
            $table->foreignId('ajoute_par')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
            $table->index('type_piece', 'idx_piece_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pieces_jointes_colis');
    }
};
