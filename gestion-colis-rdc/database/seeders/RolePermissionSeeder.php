<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Toutes les permissions pour SUPER_ADMIN
        $superAdminId = DB::table('roles')->where('code', 'SUPER_ADMIN')->value('id');
        $permissionIds = DB::table('permissions')->pluck('id');

        foreach ($permissionIds as $pid) {
            DB::table('role_permissions')->insert([
                'role_id' => $superAdminId,
                'permission_id' => $pid,
            ]);
        }

        // Attribution ciblée pour les autres rôles
        $mapping = [
            'ADMIN' => [
                'dashboard.view','users.view','users.create','users.update',
                'agences.view','clients.view','clients.manage',
                'colis.view','colis.create','colis.update','colis.cancel','colis.track',
                'expeditions.manage','transfers.manage',
                'payments.view','payments.collect','reports.view',
                'withdrawals.manage','deliveries.manage',
            ],
            'DIRECTEUR_AGENCE' => [
                'dashboard.view','colis.view','colis.track',
                'agences.view','clients.view',
                'payments.view','reports.view',
                'withdrawals.manage','deliveries.manage',
            ],
            'AGENT_RECEPTION' => ['dashboard.view','colis.view','colis.create','clients.view','clients.manage','colis.track'],
            'AGENT_TRANSIT' => ['dashboard.view','colis.view','colis.track','expeditions.manage','transfers.manage'],
            'CAISSIER' => ['dashboard.view','payments.view','payments.collect','colis.view'],
            'LIVREUR' => ['dashboard.view','deliveries.manage','colis.view','colis.track'],
            'AGENT_RETRAIT' => ['dashboard.view','colis.view','withdrawals.manage','colis.track'],
            'COMPTABLE' => ['dashboard.view','payments.view','reports.view'],
            'CLIENT' => ['colis.track'],
        ];

        foreach ($mapping as $roleCode => $permCodes) {
            $roleId = DB::table('roles')->where('code', $roleCode)->value('id');
            $pids = DB::table('permissions')->whereIn('code', $permCodes)->pluck('id');
            foreach ($pids as $pid) {
                DB::table('role_permissions')->insert([
                    'role_id' => $roleId,
                    'permission_id' => $pid,
                ]);
            }
        }
    }
}