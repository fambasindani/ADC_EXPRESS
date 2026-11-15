<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agences', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('nom', 150);
            $table->foreignId('province_id')->constrained('provinces');
            $table->foreignId('ville_id')->constrained('villes');
            $table->foreignId('commune_id')->nullable()->constrained('communes');
            $table->string('adresse', 255);
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->enum('type_agence', ['SIEGE', 'PRINCIPALE', 'SECONDAIRE', 'POINT_RELAIS'])->default('SECONDAIRE');
            $table->foreignId('agence_parent_id')->nullable()->constrained('agences');
            $table->boolean('actif')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->index('actif', 'idx_agence_actif');
            $table->index('type_agence', 'idx_agence_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agences');
    }
};
