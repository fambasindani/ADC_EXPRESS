<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Sequence extends Model
{
    protected $table = 'sequences';
    protected $primaryKey = 'nom';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = ['nom', 'prefixe', 'annee', 'dernier_numero'];
    protected $casts = ['updated_at' => 'datetime'];

    /**
     * Table + colonne associées à chaque séquence pour détecter les collisions.
     */
    private const TABLE_MAP = [
        'colis'      => ['colis',       'numero_suivi'],
        'facture'    => ['factures',    'numero_facture'],
        'paiement'   => ['paiements',   'reference_paiement'],
        'expedition' => ['expeditions', 'reference'],
    ];

    /**
     * Génère le prochain numéro atomique.
     * Boucle de sécurité : si le numéro existe déjà en base, incrémente.
     */
    public static function next(string $nom): string
    {
        return DB::transaction(function () use ($nom) {
            $seq = static::lockForUpdate()->findOrFail($nom);
            $seq->dernier_numero += 1;

            $tentatives = 0;
            do {
                $numero = sprintf('%s-%d-%06d', $seq->prefixe, $seq->annee, $seq->dernier_numero);

                $existe = false;
                if (isset(self::TABLE_MAP[$nom])) {
                    [$table, $colonne] = self::TABLE_MAP[$nom];
                    $existe = DB::table($table)->where($colonne, $numero)->exists();
                }

                if ($existe) {
                    $seq->dernier_numero += 1;
                    $tentatives++;
                }
            } while ($existe && $tentatives < 1000);

            $seq->save();

            return $numero;
        });
    }
}