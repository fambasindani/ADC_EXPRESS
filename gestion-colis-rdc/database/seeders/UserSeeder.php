<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $agenceId = DB::table('agences')->where('code', 'KIN-01')->value('id');
        $superAdminRoleId = DB::table('roles')->where('code', 'SUPER_ADMIN')->value('id');

        $userId = DB::table('users')->insertGetId([
            'agence_id' => $agenceId,
            'nom' => 'Mukendi',
            'postnom' => 'Kalonji',
            'prenom' => 'Robby',
            'email' => 'pierre@gmail.com',
            'telephone' => '+243 822 353 038',
            'password_hash' => Hash::make('12345678'),
            'statut' => 'ACTIF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('user_roles')->insert([
            'user_id' => $userId,
            'role_id' => $superAdminRoleId,
            'agence_id' => $agenceId,
        ]);
    }
}