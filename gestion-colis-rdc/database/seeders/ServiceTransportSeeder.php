<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ServiceTransportSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('services_transport')->insert([
            ['code' => 'STANDARD', 'libelle' => 'Standard', 'delai_indicatif_jours' => 5, 'description' => 'Acheminement standard', 'actif' => true],
            ['code' => 'EXPRESS', 'libelle' => 'Express', 'delai_indicatif_jours' => 2, 'description' => 'Acheminement prioritaire', 'actif' => true],
            ['code' => 'ECONOMIQUE', 'libelle' => 'Economique', 'delai_indicatif_jours' => 10, 'description' => 'Acheminement a tarif economique', 'actif' => true],
        ]);
    }
}