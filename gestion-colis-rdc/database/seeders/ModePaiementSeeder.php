<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ModePaiementSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('modes_paiement')->insert([
            ['code' => 'ESPECES', 'libelle' => 'Especes', 'categorie' => 'ESPECES', 'operateur' => null, 'actif' => true],
            ['code' => 'MPESA', 'libelle' => 'M-Pesa', 'categorie' => 'MOBILE_MONEY', 'operateur' => 'Vodacom', 'actif' => true],
            ['code' => 'AIRTEL_MONEY', 'libelle' => 'Airtel Money', 'categorie' => 'MOBILE_MONEY', 'operateur' => 'Airtel', 'actif' => true],
            ['code' => 'ORANGE_MONEY', 'libelle' => 'Orange Money', 'categorie' => 'MOBILE_MONEY', 'operateur' => 'Orange', 'actif' => true],
            ['code' => 'AFRICELL_MONEY', 'libelle' => 'Africell Money', 'categorie' => 'MOBILE_MONEY', 'operateur' => 'Africell', 'actif' => true],
            ['code' => 'VIREMENT', 'libelle' => 'Virement bancaire', 'categorie' => 'BANQUE', 'operateur' => null, 'actif' => true],
            ['code' => 'CARTE', 'libelle' => 'Carte bancaire', 'categorie' => 'CARTE', 'operateur' => null, 'actif' => true],
        ]);
    }
}