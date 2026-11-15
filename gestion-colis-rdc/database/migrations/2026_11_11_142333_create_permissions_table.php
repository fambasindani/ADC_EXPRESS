<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 100)->unique();
            $table->string('module', 80);
            $table->string('nom', 150);
            $table->string('description', 255)->nullable();
            $table->index('module', 'idx_permission_module');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
