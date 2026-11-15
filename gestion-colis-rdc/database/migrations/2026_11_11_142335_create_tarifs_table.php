<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tarifs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agence_origine_id')->nullable()->constrained('agences');
            $table->foreignId('agence_destination_id')->nullable()->constrained('agences');
            $table->foreignId('service_id')->constrained('services_transport');
            $table->char('devise_code', 3);
            $table->decimal('prix_base', 15, 2)->default(0);
            $table->decimal('prix_kg', 15, 2)->default(0);
            $table->decimal('frais_supplementaires', 15, 2)->default(0);
            $table->decimal('poids_min', 10, 3)->default(0);
            $table->decimal('poids_max', 10, 3)->nullable();
            $table->date('date_debut');
            $table->date('date_fin')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['agence_origine_id', 'agence_destination_id', 'service_id'], 'idx_tarif_route');
            $table->index(['actif', 'date_debut', 'date_fin'], 'idx_tarif_actif_dates');
            $table->unique(['agence_origine_id', 'agence_destination_id', 'service_id', 'devise_code', 'date_debut'], 'uq_tarif_route');
            $table->foreign('devise_code')->references('code')->on('devises');
        });

        DB::statement('ALTER TABLE tarifs ADD CONSTRAINT chk_tarif_prix CHECK (prix_base >= 0 AND prix_kg >= 0 AND frais_supplementaires >= 0)');
        DB::statement('ALTER TABLE tarifs ADD CONSTRAINT chk_tarif_poids CHECK (poids_min >= 0 AND (poids_max IS NULL OR poids_max > poids_min))');
    }

    public function down(): void
    {
        Schema::dropIfExists('tarifs');
    }
};
