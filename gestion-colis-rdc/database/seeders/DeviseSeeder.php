<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DeviseSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('devises')->insert([
            ['code' => 'CDF', 'nom' => 'Franc congolais', 'symbole' => 'FC', 'decimales' => 2, 'actif' => true],
            ['code' => 'USD', 'nom' => 'Dollar americain', 'symbole' => '$', 'decimales' => 2, 'actif' => true],
        ]);
    }
}