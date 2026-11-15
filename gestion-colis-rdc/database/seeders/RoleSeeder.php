<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('roles')->insert([
            ['code' => 'SUPER_ADMIN', 'nom' => 'Super administrateur', 'description' => 'Administration globale de la plateforme', 'actif' => true],
            ['code' => 'ADMIN', 'nom' => 'Administrateur', 'description' => 'Administration operationnelle', 'actif' => true],
            ['code' => 'DIRECTEUR_AGENCE', 'nom' => 'Directeur d agence', 'description' => 'Supervision de son agence', 'actif' => true],
            ['code' => 'AGENT_RECEPTION', 'nom' => 'Agent de reception', 'description' => 'Enregistrement des colis', 'actif' => true],
            ['code' => 'AGENT_TRANSIT', 'nom' => 'Agent de transit', 'description' => 'Expedition et reception inter-agences', 'actif' => true],
            ['code' => 'CAISSIER', 'nom' => 'Caissier', 'description' => 'Encaissement et edition des recus', 'actif' => true],
            ['code' => 'LIVREUR', 'nom' => 'Livreur', 'description' => 'Livraison des colis', 'actif' => true],
            ['code' => 'AGENT_RETRAIT', 'nom' => 'Agent de retrait', 'description' => 'Verification et remise des colis', 'actif' => true],
            ['code' => 'COMPTABLE', 'nom' => 'Comptable', 'description' => 'Consultation financiere et rapprochement', 'actif' => true],
            ['code' => 'CLIENT', 'nom' => 'Client', 'description' => 'Consultation de ses expeditions', 'actif' => true],
        ]);
    }
}