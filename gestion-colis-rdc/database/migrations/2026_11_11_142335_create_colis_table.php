<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('colis', function (Blueprint $table) {
            $table->id();
            $table->string('numero_suivi', 40)->unique();
            $table->foreignId('client_expediteur_id')->constrained('clients');
            $table->string('nom_expediteur', 180);
            $table->string('telephone_expediteur', 30);
            $table->string('adresse_expediteur', 255)->nullable();
            $table->string('nom_destinataire', 180);
            $table->string('telephone_destinataire', 30);
            $table->string('email_destinataire', 150)->nullable();
            $table->string('adresse_destinataire', 255)->nullable();
            $table->foreignId('ville_destination_id')->nullable()->constrained('villes');
            $table->foreignId('agence_depot_id')->constrained('agences');
            $table->foreignId('agence_destination_id')->constrained('agences');
            $table->foreignId('type_colis_id')->constrained('types_colis');
            $table->foreignId('service_id')->constrained('services_transport');
            $table->text('description_contenu')->nullable();
            $table->decimal('poids_kg', 10, 3);
            $table->decimal('longueur_cm', 10, 2)->nullable();
            $table->decimal('largeur_cm', 10, 2)->nullable();
            $table->decimal('hauteur_cm', 10, 2)->nullable();
            $table->decimal('valeur_declaree', 15, 2)->nullable();
            $table->char('devise_valeur', 3)->nullable();
            $table->decimal('montant_transport', 15, 2);
            $table->char('devise_paiement', 3);
            $table->enum('mode_facturation', ['PAYE_AU_DEPOT', 'PAYE_AU_RETRAIT']);
            $table->enum('statut', ['ENREGISTRE', 'EN_ATTENTE_PAIEMENT', 'PRET_EXPEDITION', 'EN_TRANSIT', 'ARRIVE_AGENCE', 'EN_LIVRAISON', 'LIVRE', 'RETIRE', 'ANNULE', 'PERDU', 'ENDOMMAGE', 'RETOUR'])->default('ENREGISTRE');
            $table->dateTime('date_depot')->useCurrent();
            $table->date('date_estimee_arrivee')->nullable();
            $table->dateTime('date_arrivee')->nullable();
            $table->dateTime('date_cloture')->nullable();
            $table->text('observations')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('statut', 'idx_colis_statut');
            $table->index(['date_depot', 'date_estimee_arrivee'], 'idx_colis_dates');
            $table->index('telephone_destinataire', 'idx_colis_destinataire');
            $table->index(['agence_depot_id', 'agence_destination_id'], 'idx_colis_agences');
            $table->index('telephone_expediteur', 'idx_colis_tel_expediteur');
            $table->index(['agence_depot_id', 'statut'], 'idx_colis_depot_statut');
            $table->index(['agence_destination_id', 'statut'], 'idx_colis_dest_statut');
            $table->index(['statut', 'date_depot'], 'idx_colis_statut_datedepot');

            $table->foreign('devise_valeur')->references('code')->on('devises');
            $table->foreign('devise_paiement')->references('code')->on('devises');
        });

        DB::statement('ALTER TABLE colis ADD CONSTRAINT chk_colis_poids CHECK (poids_kg > 0)');
        DB::statement('ALTER TABLE colis ADD CONSTRAINT chk_colis_montant CHECK (montant_transport >= 0)');
        DB::statement('ALTER TABLE colis ADD CONSTRAINT chk_colis_valeur CHECK (valeur_declaree IS NULL OR valeur_declaree >= 0)');
        DB::statement("ALTER TABLE colis ADD CONSTRAINT chk_colis_numero CHECK (numero_suivi REGEXP '^[A-Z0-9-]{8,40}$')");
    }

    public function down(): void
    {
        Schema::dropIfExists('colis');
    }
};
