<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AgenceSeeder extends Seeder
{
    public function run(): void
    {
        $kinProvinceId = DB::table('provinces')->where('code', 'KIN')->value('id');
        $kinVilleId = DB::table('villes')->where('nom', 'Kinshasa')->value('id');
        $gombeId = DB::table('communes')->where('nom', 'Gombe')->value('id');

        DB::table('agences')->insert([
            'code' => 'KIN-01',
            'nom' => 'ADC EXPRESS Kinshasa Gombe (Siège National)',
            'province_id' => $kinProvinceId,
            'ville_id' => $kinVilleId,
            'commune_id' => $gombeId,
            'adresse' => 'Boulevard du 30 Juin, Gombe, Kinshasa',
            'telephone' => '+243 822 353 038',
            'email' => 'contact@adcexpress.cd',
            'type_agence' => 'SIEGE',
            'agence_parent_id' => null,
            'actif' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}