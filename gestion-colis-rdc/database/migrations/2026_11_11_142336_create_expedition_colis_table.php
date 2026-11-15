<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expedition_colis', function (Blueprint $table) {
            $table->foreignId('expedition_id')->constrained('expeditions');
            $table->foreignId('colis_id')->constrained('colis');
            $table->dateTime('date_chargement')->useCurrent();
            $table->dateTime('date_dechargement')->nullable();
            $table->primary(['expedition_id', 'colis_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expedition_colis');
    }
};
