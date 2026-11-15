<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ville_id')->constrained('villes');
            $table->string('nom', 120);
            $table->boolean('actif')->default(true);
            $table->unique(['ville_id', 'nom'], 'uq_commune_ville');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communes');
    }
};
