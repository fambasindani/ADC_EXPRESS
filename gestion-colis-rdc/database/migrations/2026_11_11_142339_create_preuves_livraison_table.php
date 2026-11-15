<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('preuves_livraison', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livraison_id');
            $table->unique('livraison_id', 'uq_preuve_livraison');
            $table->string('nom_receptionnaire', 180);
            $table->string('telephone_receptionnaire', 30)->nullable();
            $table->string('signature_path', 255)->nullable();
            $table->string('photo_path', 255)->nullable();
            $table->boolean('code_otp_verifie')->default(false);
            $table->dateTime('date_preuve')->useCurrent();
            $table->foreign('livraison_id')->references('id')->on('livraisons');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('preuves_livraison');
    }
};
