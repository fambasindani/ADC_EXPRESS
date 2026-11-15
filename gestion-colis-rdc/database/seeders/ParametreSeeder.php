<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ParametreSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('parametres')->insert([
            ['cle' => 'pays', 'valeur' => 'Republique Democratique du Congo', 'description' => 'Pays d exploitation'],
            ['cle' => 'devise_defaut', 'valeur' => 'CDF', 'description' => 'Devise par defaut'],
            ['cle' => 'paiement_depot_active', 'valeur' => '1', 'description' => 'Autoriser paiement au depot'],
            ['cle' => 'paiement_retrait_active', 'valeur' => '1', 'description' => 'Autoriser paiement au retrait'],
            ['cle' => 'suivi_public_actif', 'valeur' => '1', 'description' => 'Suivi public par numero'],
        ]);
    }
}