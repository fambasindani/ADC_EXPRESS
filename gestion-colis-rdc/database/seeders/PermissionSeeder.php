<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['code' => 'dashboard.view', 'module' => 'dashboard', 'nom' => 'Consulter le tableau de bord'],
            ['code' => 'users.view', 'module' => 'utilisateurs', 'nom' => 'Consulter les utilisateurs'],
            ['code' => 'users.create', 'module' => 'utilisateurs', 'nom' => 'Creer un utilisateur'],
            ['code' => 'users.update', 'module' => 'utilisateurs', 'nom' => 'Modifier un utilisateur'],
            ['code' => 'users.delete', 'module' => 'utilisateurs', 'nom' => 'Desactiver un utilisateur'],
            ['code' => 'roles.manage', 'module' => 'securite', 'nom' => 'Gerer les roles et permissions'],
            ['code' => 'agences.view', 'module' => 'agences', 'nom' => 'Consulter les agences'],
            ['code' => 'agences.manage', 'module' => 'agences', 'nom' => 'Gerer les agences'],
            ['code' => 'clients.view', 'module' => 'clients', 'nom' => 'Consulter les clients'],
            ['code' => 'clients.manage', 'module' => 'clients', 'nom' => 'Gerer les clients'],
            ['code' => 'colis.view', 'module' => 'colis', 'nom' => 'Consulter les colis'],
            ['code' => 'colis.create', 'module' => 'colis', 'nom' => 'Enregistrer un colis'],
            ['code' => 'colis.update', 'module' => 'colis', 'nom' => 'Modifier un colis'],
            ['code' => 'colis.cancel', 'module' => 'colis', 'nom' => 'Annuler un colis'],
            ['code' => 'colis.track', 'module' => 'suivi', 'nom' => 'Consulter le suivi des colis'],
            ['code' => 'expeditions.manage', 'module' => 'transport', 'nom' => 'Gerer les expeditions'],
            ['code' => 'transfers.manage', 'module' => 'transport', 'nom' => 'Gerer les transferts inter-agences'],
            ['code' => 'payments.view', 'module' => 'finance', 'nom' => 'Consulter les paiements'],
            ['code' => 'payments.collect', 'module' => 'finance', 'nom' => 'Encaisser un paiement'],
            ['code' => 'payments.refund', 'module' => 'finance', 'nom' => 'Gerer les remboursements'],
            ['code' => 'reports.view', 'module' => 'rapports', 'nom' => 'Consulter les rapports'],
            ['code' => 'withdrawals.manage', 'module' => 'retraits', 'nom' => 'Autoriser et enregistrer les retraits'],
            ['code' => 'deliveries.manage', 'module' => 'livraisons', 'nom' => 'Gerer les livraisons'],
        ];

        foreach ($permissions as $p) {
            DB::table('permissions')->insert($p + ['description' => null]);
        }
    }
}