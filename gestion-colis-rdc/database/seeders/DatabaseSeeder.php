<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            DeviseSeeder::class,
            ModePaiementSeeder::class,
            TypeColisSeeder::class,
            ServiceTransportSeeder::class,
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            ParametreSeeder::class,
            SequenceSeeder::class,
            LocalisationSeeder::class,
            AgenceSeeder::class,
            UserSeeder::class,
        ]);
    }
}