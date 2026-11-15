<?php

namespace Database\Seeders;

use App\Models\Colis;
use Illuminate\Database\Seeder;

class TestColisSeeder extends Seeder
{
    public function run(): void
    {
        Colis::create([
            'numero_suivi'           => 'ADC-2026-000001',
            'client_expediteur_id'   => 1,
            'nom_expediteur'         => 'Test',
            'telephone_expediteur'   => '+243 000 000 000',
            'nom_destinataire'       => 'Dest',
            'telephone_destinataire' => '+243 000 000 001',
            'agence_depot_id'        => 1,
            'agence_destination_id'  => 2,
            'type_colis_id'          => 1,
            'service_id'             => 1,
            'poids_kg'               => 2.5,
            'montant_transport'      => 50.00,
            'devise_paiement'        => 'USD',
            'mode_facturation'       => 'PAYE_AU_DEPOT',
            'statut'                 => 'PRET_EXPEDITION',
            'created_by'             => 1,
        ]);
    }
}