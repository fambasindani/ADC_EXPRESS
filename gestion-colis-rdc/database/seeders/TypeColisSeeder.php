<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TypeColisSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('types_colis')->insert([
            ['code' => 'DOCUMENT', 'libelle' => 'Documents', 'description' => 'Courriers et documents', 'fragile' => false, 'actif' => true],
            ['code' => 'PAQUET', 'libelle' => 'Paquet', 'description' => 'Colis ordinaire', 'fragile' => false, 'actif' => true],
            ['code' => 'FRAGILE', 'libelle' => 'Colis fragile', 'description' => 'Colis necessitant une manipulation speciale', 'fragile' => true, 'actif' => true],
            ['code' => 'ELECTRONIQUE', 'libelle' => 'Equipement electronique', 'description' => 'Appareils et accessoires electroniques', 'fragile' => true, 'actif' => true],
            ['code' => 'AUTRE', 'libelle' => 'Autre', 'description' => 'Autre type de colis autorise', 'fragile' => false, 'actif' => true],
        ]);
    }
}