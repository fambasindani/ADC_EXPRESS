<?php

namespace App\Support;

/**
 * Libellés et progression des statuts de colis pour les vues Blade publiques
 * (étiquette imprimable et page de suivi). Les codes restent ceux de l'API.
 */
class StatutColis
{
    public const LIBELLES = [
        'ENREGISTRE'           => 'Enregistré',
        'EN_ATTENTE_PAIEMENT'  => 'En attente de paiement',
        'PRET_EXPEDITION'      => 'Prêt pour expédition',
        'EN_TRANSIT'           => 'En transit',
        'ARRIVE_AGENCE'        => "Arrivé à l'agence",
        'EN_LIVRAISON'         => 'En cours de livraison',
        'LIVRE'                => 'Livré',
        'RETIRE'               => 'Retiré',
        'ANNULE'               => 'Annulé',
        'PERDU'                => 'Perdu',
        'ENDOMMAGE'            => 'Endommagé',
        'RETOUR'               => 'Retourné',
    ];

    /** Étapes affichées dans la progression du suivi public. */
    public const ETAPES = [
        'ENREGISTRE'      => 'Enregistré',
        'PRET_EXPEDITION' => 'Prêt',
        'EN_TRANSIT'      => 'En transit',
        'ARRIVE_AGENCE'   => 'Arrivé',
        'EN_LIVRAISON'    => 'En livraison',
        'LIVRE'           => 'Livré',
    ];

    public static function libelle(?string $statut): string
    {
        return self::LIBELLES[$statut] ?? (string) $statut;
    }

    /** Suffixe de classe CSS pour la pastille de statut (ex. `en-transit`). */
    public static function classe(?string $statut): string
    {
        return strtolower(str_replace('_', '-', (string) $statut));
    }

    /**
     * Position dans la progression, ou null pour un statut hors parcours
     * normal (annulé, perdu, endommagé, retourné).
     */
    public static function etapeCourante(?string $statut): ?int
    {
        $equivalent = match ($statut) {
            'EN_ATTENTE_PAIEMENT' => 'ENREGISTRE',
            'RETIRE'              => 'LIVRE',
            default               => $statut,
        };

        $index = array_search($equivalent, array_keys(self::ETAPES), true);

        return $index === false ? null : $index;
    }

    public static function estAnormal(?string $statut): bool
    {
        return in_array($statut, ['ANNULE', 'RETOUR', 'PERDU', 'ENDOMMAGE'], true);
    }
}
