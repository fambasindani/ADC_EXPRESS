<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Colis extends Model
{
    protected $table = 'colis';
    protected $fillable = [
        'numero_suivi', 'client_expediteur_id',
        'nom_expediteur', 'telephone_expediteur', 'adresse_expediteur',
        'nom_destinataire', 'telephone_destinataire', 'email_destinataire', 'adresse_destinataire',
        'ville_destination_id', 'agence_depot_id', 'agence_destination_id',
        'type_colis_id', 'service_id', 'description_contenu',
        'poids_kg', 'longueur_cm', 'largeur_cm', 'hauteur_cm',
        'valeur_declaree', 'devise_valeur',
        'montant_transport', 'devise_paiement', 'mode_facturation',
        'statut', 'date_depot', 'date_estimee_arrivee', 'date_arrivee', 'date_cloture',
        'observations', 'created_by'
    ];
    protected $casts = [
        'poids_kg' => 'decimal:3',
        'longueur_cm' => 'decimal:2',
        'largeur_cm' => 'decimal:2',
        'hauteur_cm' => 'decimal:2',
        'valeur_declaree' => 'decimal:2',
        'montant_transport' => 'decimal:2',
        'date_depot' => 'datetime',
        'date_estimee_arrivee' => 'date',
        'date_arrivee' => 'datetime',
        'date_cloture' => 'datetime',
    ];

    // --- Relations ---
    public function clientExpediteur(): BelongsTo { return $this->belongsTo(Client::class, 'client_expediteur_id'); }
    public function villeDestination(): BelongsTo { return $this->belongsTo(Ville::class, 'ville_destination_id'); }
    public function agenceDepot(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_depot_id'); }
    public function agenceDestination(): BelongsTo { return $this->belongsTo(Agence::class, 'agence_destination_id'); }
    public function typeColis(): BelongsTo { return $this->belongsTo(TypeColis::class, 'type_colis_id'); }
    public function service(): BelongsTo { return $this->belongsTo(ServiceTransport::class, 'service_id'); }
    public function devisePaiement(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_paiement', 'code'); }
    public function deviseValeur(): BelongsTo { return $this->belongsTo(Devise::class, 'devise_valeur', 'code'); }
    public function createur(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    public function facture(): HasOne { return $this->hasOne(Facture::class); }
    public function paiements(): HasMany { return $this->hasMany(Paiement::class); }
    public function historique(): HasMany { return $this->hasMany(HistoriqueColis::class)->orderByDesc('date_evenement'); }
    public function expeditions(): BelongsToMany
    {
        return $this->belongsToMany(Expedition::class, 'expedition_colis')
                    ->withPivot('date_chargement', 'date_dechargement');
    }
    public function transferts(): HasMany { return $this->hasMany(TransfertColis::class); }
    public function retrait(): HasOne { return $this->hasOne(Retrait::class); }
    public function livraisons(): HasMany { return $this->hasMany(Livraison::class); }
    public function otpCodes(): HasMany { return $this->hasMany(OtpCode::class); }
    public function notifications(): HasMany { return $this->hasMany(Notification::class); }
    public function piecesJointes(): HasMany { return $this->hasMany(PieceJointeColis::class); }

    // --- Helpers métier ---
    public function getMontantPayeAttribute(): float
    {
        return (float) $this->paiements()->where('statut', 'VALIDE')->sum('montant');
    }

    public function getSoldeAttribute(): float
    {
        return (float) $this->montant_transport - $this->getMontantPayeAttribute();
    }

    public function estPaye(): bool
    {
        return $this->getSoldeAttribute() <= 0;
    }

    /**
     * Aligne les livraisons encore actives sur le statut courant du colis.
     *
     * Sans cela, un colis passé en LIVRE/RETIRE/ANNULE depuis « Changer le statut »
     * (ou via un retrait au guichet) laisse sa livraison en EN_COURS : la liste
     * /livraisons affiche alors une livraison en cours pour un colis déjà livré.
     */
    public function synchroniserLivraisons(): void
    {
        $actives = $this->livraisons()
            ->whereIn('statut', ['A_AFFECTER', 'EN_COURS'])
            ->get();

        if ($actives->isEmpty() || $this->statut === 'EN_LIVRAISON') {
            return;
        }

        $termine = in_array($this->statut, ['RETIRE', 'ANNULE', 'RETOUR', 'PERDU', 'ENDOMMAGE']);

        foreach ($actives as $livraison) {
            if ($this->statut === 'LIVRE') {
                $livraison->update([
                    'statut'         => 'LIVRE',
                    'date_livraison' => $livraison->date_livraison ?? now(),
                    'motif_echec'    => null,
                ]);
                continue;
            }

            $livraison->update([
                'statut'      => 'ECHEC',
                'motif_echec' => $termine
                    ? "Livraison clôturée : colis {$this->statut}."
                    : "Livraison annulée : colis repassé en {$this->statut}.",
            ]);
        }
    }
}