<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->foreignId('colis_id')->nullable()->constrained('colis');
            $table->enum('canal', ['APPLICATION', 'SMS', 'EMAIL', 'WHATSAPP'])->default('APPLICATION');
            $table->string('destinataire', 180)->nullable();
            $table->string('sujet', 180)->nullable();
            $table->text('message');
            $table->enum('statut', ['A_ENVOYER', 'ENVOYEE', 'ECHEC', 'LUE'])->default('A_ENVOYER');
            $table->dateTime('date_envoi')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'statut'], 'idx_notification_user');
            $table->index('statut', 'idx_notification_statut');
            $table->index('canal', 'idx_notification_canal');
            $table->index('created_at', 'idx_notification_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
