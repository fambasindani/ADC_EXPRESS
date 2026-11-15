<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SequenceSeeder extends Seeder
{
    public function run(): void
    {
        $annee = (int) date('Y');

        DB::table('sequences')->insert([
            ['nom' => 'colis', 'prefixe' => 'ADC', 'annee' => $annee, 'dernier_numero' => 0],
            ['nom' => 'facture', 'prefixe' => 'FAC', 'annee' => $annee, 'dernier_numero' => 0],
            ['nom' => 'paiement', 'prefixe' => 'PAY', 'annee' => $annee, 'dernier_numero' => 0],
            ['nom' => 'expedition', 'prefixe' => 'EXP', 'annee' => $annee, 'dernier_numero' => 0],
        ]);
    }
}