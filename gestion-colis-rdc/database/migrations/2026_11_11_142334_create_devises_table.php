<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('devises', function (Blueprint $table) {
            $table->char('code', 3)->primary();
            $table->string('nom', 50);
            $table->string('symbole', 10);
            $table->unsignedTinyInteger('decimales')->default(2);
            $table->boolean('actif')->default(true);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devises');
    }
};
