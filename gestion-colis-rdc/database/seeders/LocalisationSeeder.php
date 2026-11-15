<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocalisationSeeder extends Seeder
{
    public function run(): void
    {
        // 26 provinces de la RDC (code / nom)
        $provinces = [
            ['KIN', 'Kinshasa'],
            ['KON', 'Kongo-Central'],
            ['KWA', 'Kwango'],
            ['KWIL', 'Kwilu'],
            ['MAI', 'Mai-Ndombe'],
            ['KAS', 'Kasaï'],
            ['KASC', 'Kasaï-Central'],
            ['KASO', 'Kasaï-Oriental'],
            ['LOM', 'Lomami'],
            ['SAN', 'Sankuru'],
            ['MAN', 'Maniema'],
            ['SKI', 'Sud-Kivu'],
            ['NKI', 'Nord-Kivu'],
            ['ITA', 'Ituri'],
            ['TSH', 'Tshopo'],
            ['BAS', 'Bas-Uele'],
            ['HAU', 'Haut-Uele'],
            ['MON', 'Mongala'],
            ['TSHU', 'Tshuapa'],
            ['EQU', 'Équateur'],
            ['SUD', 'Sud-Ubangi'],
            ['NOR', 'Nord-Ubangi'],
            ['TAN', 'Tanganyika'],
            ['HAUTK', 'Haut-Katanga'],
            ['HKL', 'Haut-Lomami'],
            ['LUA', 'Lualaba'],
        ];

        foreach ($provinces as [$code, $nom]) {
            DB::table('provinces')->insert([
                'code' => $code,
                'nom' => $nom,
                'actif' => true,
            ]);
        }

        // Villes principales par province
        $villes = [
            'KIN' => ['Kinshasa'],
            'KON' => ['Matadi', 'Boma', 'Mbanza-Ngungu'],
            'KWA' => ['Kenge'],
            'KWIL' => ['Kikwit', 'Bandundu'],
            'MAI' => ['Inongo'],
            'KAS' => ['Tshikapa', 'Luebo'],
            'KASC' => ['Kananga'],
            'KASO' => ['Mbuji-Mayi'],
            'LOM' => ['Kabinda'],
            'SAN' => ['Lusambo'],
            'MAN' => ['Kindu'],
            'SKI' => ['Bukavu', 'Uvira'],
            'NKI' => ['Goma', 'Beni', 'Butembo'],
            'ITA' => ['Bunia'],
            'TSH' => ['Kisangani'],
            'BAS' => ['Buta'],
            'HAU' => ['Isiro'],
            'MON' => ['Lisala'],
            'TSHU' => ['Boende'],
            'EQU' => ['Mbandaka'],
            'SUD' => ['Gemena'],
            'NOR' => ['Gbadolite'],
            'TAN' => ['Kalemie'],
            'HAUTK' => ['Lubumbashi', 'Likasi', 'Kipushi'],
            'HKL' => ['Kamina'],
            'LUA' => ['Kolwezi'],
        ];

        foreach ($villes as $provinceCode => $noms) {
            $provinceId = DB::table('provinces')->where('code', $provinceCode)->value('id');
            foreach ($noms as $villeNom) {
                DB::table('villes')->insert([
                    'province_id' => $provinceId,
                    'nom' => $villeNom,
                    'actif' => true,
                ]);
            }
        }

        // Communes principales de Kinshasa
        $kinshasaId = DB::table('villes')->where('nom', 'Kinshasa')->value('id');
        $communes = ['Gombe', 'Limete', 'Kintambo', 'Ngaliema', 'Masina', 'Lemba', 'Matete', 'Bandalungwa'];
        foreach ($communes as $communeNom) {
            DB::table('communes')->insert([
                'ville_id' => $kinshasaId,
                'nom' => $communeNom,
                'actif' => true,
            ]);
        }
    }
}