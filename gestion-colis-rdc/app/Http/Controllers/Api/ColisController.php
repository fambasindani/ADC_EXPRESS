<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agence;
use App\Models\Client;
use App\Models\Colis;
use App\Models\Devise;
use App\Models\Facture;
use App\Models\HistoriqueColis;
use App\Models\JournalActivite;
use App\Models\Notification;
use App\Models\PieceJointeColis;
use App\Models\Sequence;
use App\Models\ServiceTransport;
use App\Models\TypeColis;
use App\Models\Ville;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class ColisController extends Controller
{
    /**
     * GET /api/colis
     *
     * Query params :
     *   - search                  : numéro suivi, expéditeur, destinataire, téléphones
     *   - statut                  : filtre statut
     *   - mode_facturation        : PAYE_AU_DEPOT | PAYE_AU_RETRAIT
     *   - agence_depot_id         : filtre
     *   - agence_destination_id   : filtre
     *   - devise_paiement         : CDF | USD
     *   - date_start              : date_depot >= Y-m-d
     *   - date_end                : date_depot <= Y-m-d
     *   - sort_by                 : date_depot | montant_transport | numero_suivi (défaut: date_depot)
     *   - sort_dir                : asc | desc (défaut: desc)
     *   - per_page                : 5..100 (défaut: 15)
     */
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Colis::with([
            'agenceDepot:id,code,nom',
            'agenceDestination:id,code,nom',
            'villeDestination:id,nom',
            'typeColis:id,code,libelle',
            'service:id,code,libelle',
            'createur:id,nom,prenom',
        ]);

        // 🔒 Restriction par agence (sauf SUPER_ADMIN / ADMIN)
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $query->where(function ($q) use ($user) {
                $q->where('agence_depot_id', $user->agence_id)
                  ->orWhere('agence_destination_id', $user->agence_id);
            });
        }

        // 🔍 Recherche
        if ($request->filled('search')) {
            $s = trim($request->search);
            $query->where(function ($q) use ($s) {
                $q->where('numero_suivi', 'like', "%{$s}%")
                  ->orWhere('nom_expediteur', 'like', "%{$s}%")
                  ->orWhere('telephone_expediteur', 'like', "%{$s}%")
                  ->orWhere('nom_destinataire', 'like', "%{$s}%")
                  ->orWhere('telephone_destinataire', 'like', "%{$s}%");
            });
        }

        // 🎯 Filtres
        if ($request->filled('statut')) {
            $query->where('statut', $request->statut);
        }
        if ($request->filled('mode_facturation')) {
            $query->where('mode_facturation', $request->mode_facturation);
        }
        if ($request->filled('agence_depot_id')) {
            $query->where('agence_depot_id', $request->agence_depot_id);
        }
        if ($request->filled('agence_destination_id')) {
            $query->where('agence_destination_id', $request->agence_destination_id);
        }
        if ($request->filled('devise_paiement')) {
            $query->where('devise_paiement', $request->devise_paiement);
        }
        if ($request->filled('date_start')) {
            $query->whereDate('date_depot', '>=', $request->date_start);
        }
        if ($request->filled('date_end')) {
            $query->whereDate('date_depot', '<=', $request->date_end);
        }

        // 📊 Tri
        $allowedSorts = ['date_depot', 'montant_transport', 'numero_suivi', 'statut'];
        $sortBy  = in_array($request->get('sort_by'), $allowedSorts) ? $request->get('sort_by') : 'date_depot';
        $sortDir = $request->get('sort_dir') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortBy, $sortDir);

        // 📄 Pagination
        $perPage = min(max((int) $request->get('per_page', 15), 5), 100);
        $colis   = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $colis->items(),
            'meta'    => [
                'current_page' => $colis->currentPage(),
                'per_page'     => $colis->perPage(),
                'total'        => $colis->total(),
                'last_page'    => $colis->lastPage(),
                'from'         => $colis->firstItem(),
                'to'           => $colis->lastItem(),
            ],
        ]);
    }

    /**
     * POST /api/colis
     * Crée un colis + sa facture + l'historique initial en une transaction.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_expediteur_id'   => 'nullable|exists:clients,id',
            'nom_expediteur'         => 'required|string|max:180',
            'telephone_expediteur'   => 'required|string|max:30',
            'adresse_expediteur'     => 'nullable|string|max:255',

            'nom_destinataire'       => 'required|string|max:180',
            'telephone_destinataire' => 'required|string|max:30',
            'email_destinataire'     => 'nullable|email|max:150',
            'adresse_destinataire'   => 'nullable|string|max:255',
            'ville_destination_id'   => 'nullable|exists:villes,id',

            'agence_depot_id'        => 'required|exists:agences,id',
            'agence_destination_id'  => 'required|exists:agences,id|different:agence_depot_id',
            'type_colis_id'          => 'required|exists:types_colis,id',
            'service_id'             => 'required|exists:services_transport,id',

            'description_contenu'    => 'nullable|string',
            'poids_kg'               => 'required|numeric|min:0.01',
            'longueur_cm'            => 'nullable|numeric|min:0',
            'largeur_cm'             => 'nullable|numeric|min:0',
            'hauteur_cm'             => 'nullable|numeric|min:0',
            'valeur_declaree'        => 'nullable|numeric|min:0',
            'devise_valeur'          => 'nullable|exists:devises,code',

            'montant_transport'      => 'required|numeric|min:0',
            'devise_paiement'        => 'required|exists:devises,code',
            'mode_facturation'       => ['required', Rule::in(['PAYE_AU_DEPOT', 'PAYE_AU_RETRAIT'])],
            'observations'           => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $result = DB::transaction(function () use ($request) {
                $user = $request->user();

                // 🔹 Créer le client si non fourni
                $clientId = $request->client_expediteur_id;
                if (! $clientId) {
                    $client = Client::create([
                        'code_client'           => 'CLI-' . str_pad((string) ((Client::max('id') ?? 0) + 1), 5, '0', STR_PAD_LEFT),
                        'type_client'           => 'PERSONNE_PHYSIQUE',
                        'nom_ou_raison_sociale' => $request->nom_expediteur,
                        'telephone'             => $request->telephone_expediteur,
                        'adresse'               => $request->adresse_expediteur,
                    ]);
                    $clientId = $client->id;
                }

                // 🔹 Statut initial selon le mode de facturation
                $statutInitial = $request->mode_facturation === 'PAYE_AU_DEPOT'
                    ? 'PRET_EXPEDITION'
                    : 'EN_ATTENTE_PAIEMENT';

                // 🔹 Date estimée d'arrivée
                $service = ServiceTransport::find($request->service_id);
                $dateEstimee = $service && $service->delai_indicatif_jours
                    ? now()->addDays($service->delai_indicatif_jours)->toDateString()
                    : null;

                // 🔹 Créer le colis
                $colis = Colis::create([
                    'numero_suivi'           => Sequence::next('colis'),
                    'client_expediteur_id'   => $clientId,
                    'nom_expediteur'         => $request->nom_expediteur,
                    'telephone_expediteur'   => $request->telephone_expediteur,
                    'adresse_expediteur'     => $request->adresse_expediteur,
                    'nom_destinataire'       => $request->nom_destinataire,
                    'telephone_destinataire' => $request->telephone_destinataire,
                    'email_destinataire'     => $request->email_destinataire,
                    'adresse_destinataire'   => $request->adresse_destinataire,
                    'ville_destination_id'   => $request->ville_destination_id,
                    'agence_depot_id'        => $request->agence_depot_id,
                    'agence_destination_id'  => $request->agence_destination_id,
                    'type_colis_id'          => $request->type_colis_id,
                    'service_id'             => $request->service_id,
                    'description_contenu'    => $request->description_contenu,
                    'poids_kg'               => $request->poids_kg,
                    'longueur_cm'            => $request->longueur_cm,
                    'largeur_cm'             => $request->largeur_cm,
                    'hauteur_cm'             => $request->hauteur_cm,
                    'valeur_declaree'        => $request->valeur_declaree,
                    'devise_valeur'          => $request->devise_valeur,
                    'montant_transport'      => $request->montant_transport,
                    'devise_paiement'        => $request->devise_paiement,
                    'mode_facturation'       => $request->mode_facturation,
                    'statut'                 => $statutInitial,
                    'date_depot'             => now(),
                    'date_estimee_arrivee'   => $dateEstimee,
                    'observations'           => $request->observations,
                    'created_by'             => $user->id,
                ]);

                // 🔹 Créer la facture
                $facture = Facture::create([
                    'numero_facture' => Sequence::next('facture'),
                    'colis_id'       => $colis->id,
                    'montant_total'  => $colis->montant_transport,
                    'devise_code'    => $colis->devise_paiement,
                    'date_facture'   => now(),
                    'statut'         => 'EN_ATTENTE',
                    'cree_par'       => $user->id,
                ]);

                // 🔹 Historique initial
                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $colis->agence_depot_id,
                    'user_id'        => $user->id,
                    'ancien_statut'  => null,
                    'nouveau_statut' => $statutInitial,
                    'commentaire'    => 'Colis enregistré au dépôt',
                ]);

                Notification::creer(
                    null,
                    $colis->id,
                    'APPLICATION',
                    "Le colis {$colis->numero_suivi} a été enregistré.",
                    'Nouveau colis'
                );

                JournalActivite::enregistrer(
                    'colis.store',
                    'colis',
                    $colis->id,
                    ['numero_suivi' => $colis->numero_suivi],
                    $user
                );

                return ['colis' => $colis, 'facture' => $facture];
            });

            return response()->json([
                'success' => true,
                'message' => 'Colis enregistré avec succès.',
                'data'    => [
                    'colis'   => $result['colis']->load('agenceDepot', 'agenceDestination', 'typeColis', 'service', 'villeDestination'),
                    'facture' => $result['facture'],
                ],
            ], 201);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/colis/{id}
     */
    public function show($id, Request $request)
    {
        $colis = Colis::with([
            'clientExpediteur',
            'agenceDepot:id,code,nom',
            'agenceDestination:id,code,nom',
            'villeDestination:id,nom,province_id',
            'typeColis',
            'service',
            'createur:id,nom,prenom',
            'facture',
            'paiements.modePaiement:id,code,libelle',
            'paiements.encaissePar:id,nom,prenom',
            'historique' => fn ($q) => $q->with('user:id,nom,prenom', 'agence:id,code,nom'),
            'transferts.agenceDepart:id,code,nom',
            'transferts.agenceArrivee:id,code,nom',
            'retrait',
            'livraisons.livreur:id,nom,prenom',
            'piecesJointes.ajoutePar:id,nom,prenom',
        ])->findOrFail($id);

        // 🔒 Restriction par agence
        $user = $request->user();
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            if ($colis->agence_depot_id !== $user->agence_id &&
                $colis->agence_destination_id !== $user->agence_id) {
                return response()->json(['success' => false, 'message' => 'Accès refusé à ce colis.'], 403);
            }
        }

        // Enrichissement
        $colis->montant_paye = $colis->montant_paye;
        $colis->solde        = $colis->solde;
        $colis->est_paye     = $colis->estPaye();

        return response()->json(['success' => true, 'data' => $colis]);
    }

    /**
     * PUT /api/colis/{id}
     * Modification d'un colis existant.
     *
     * Le statut n'est pas modifiable ici : il doit passer par
     * POST /api/colis/{id}/changer-statut afin de conserver l'historique.
     */
    public function update(Request $request, $id)
    {
        $colis = Colis::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nom_expediteur'         => 'sometimes|required|string|max:180',
            'telephone_expediteur'   => 'sometimes|required|string|max:30',
            'adresse_expediteur'     => 'nullable|string|max:255',

            'nom_destinataire'       => 'sometimes|required|string|max:180',
            'telephone_destinataire' => 'sometimes|required|string|max:30',
            'email_destinataire'     => 'nullable|email|max:150',
            'adresse_destinataire'   => 'nullable|string|max:255',
            'ville_destination_id'   => 'nullable|exists:villes,id',

            'agence_depot_id'        => 'sometimes|required|exists:agences,id',
            'agence_destination_id'  => 'sometimes|required|exists:agences,id',
            'type_colis_id'          => 'sometimes|required|exists:types_colis,id',
            'service_id'             => 'sometimes|required|exists:services_transport,id',

            'description_contenu'    => 'nullable|string',
            'poids_kg'               => 'sometimes|required|numeric|min:0.01',
            'longueur_cm'            => 'nullable|numeric|min:0',
            'largeur_cm'             => 'nullable|numeric|min:0',
            'hauteur_cm'             => 'nullable|numeric|min:0',
            'valeur_declaree'        => 'nullable|numeric|min:0',
            'devise_valeur'          => 'nullable|exists:devises,code',

            'montant_transport'      => 'sometimes|required|numeric|min:0',
            'devise_paiement'        => 'sometimes|required|exists:devises,code',
            'mode_facturation'       => ['sometimes', 'required', Rule::in(['PAYE_AU_DEPOT', 'PAYE_AU_RETRAIT'])],

            'date_estimee_arrivee'   => 'nullable|date',
            'observations'           => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $request->only([
            'nom_expediteur', 'telephone_expediteur', 'adresse_expediteur',
            'nom_destinataire', 'telephone_destinataire', 'email_destinataire',
            'adresse_destinataire', 'ville_destination_id',
            'agence_depot_id', 'agence_destination_id', 'type_colis_id', 'service_id',
            'description_contenu', 'poids_kg', 'longueur_cm', 'largeur_cm', 'hauteur_cm',
            'valeur_declaree', 'devise_valeur',
            'montant_transport', 'devise_paiement', 'mode_facturation',
            'date_estimee_arrivee', 'observations',
        ]);

        // Les agences de dépôt et de destination doivent rester différentes.
        $agenceDepot       = $data['agence_depot_id'] ?? $colis->agence_depot_id;
        $agenceDestination = $data['agence_destination_id'] ?? $colis->agence_destination_id;
        if ((int) $agenceDepot === (int) $agenceDestination) {
            return response()->json([
                'success' => false,
                'message' => 'Les agences de dépôt et de destination doivent être différentes.',
            ], 422);
        }

        // Un montant déjà (partiellement) encaissé ne peut plus être modifié.
        $montantModifie = array_key_exists('montant_transport', $data)
            && (float) $data['montant_transport'] !== (float) $colis->montant_transport;
        $deviseModifiee = array_key_exists('devise_paiement', $data)
            && $data['devise_paiement'] !== $colis->devise_paiement;

        if (($montantModifie || $deviseModifiee) && $colis->paiements()->where('statut', 'VALIDE')->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Le montant ne peut plus être modifié : des paiements validés existent déjà pour ce colis.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($colis, $data, $request, $montantModifie, $deviseModifiee) {
                $colis->update($data);

                // Synchronise la facture associée si le montant ou la devise change.
                if ($montantModifie || $deviseModifiee) {
                    $colis->facture()->update([
                        'montant_total' => $colis->montant_transport,
                        'devise_code'   => $colis->devise_paiement,
                    ]);
                }

                JournalActivite::enregistrer(
                    'colis.update',
                    'colis',
                    $colis->id,
                    ['champs' => array_keys($data)],
                    $request->user()
                );
            });

            return response()->json([
                'success' => true,
                'message' => 'Colis mis à jour.',
                'data'    => $colis->fresh()->load(
                    'agenceDepot',
                    'agenceDestination',
                    'typeColis',
                    'service',
                    'villeDestination',
                    'facture'
                ),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la modification : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/colis/{id}
     * Annulation logique (statut ANNULE) — pas de suppression physique.
     */
    public function destroy(Request $request, $id)
    {
        $colis = Colis::findOrFail($id);

        if (in_array($colis->statut, ['LIVRE', 'RETIRE', 'ANNULE'])) {
            return response()->json([
                'success' => false,
                'message' => 'Ce colis ne peut plus être annulé (statut : ' . $colis->statut . ').',
            ], 422);
        }

        try {
            DB::transaction(function () use ($colis, $request) {
                $ancienStatut = $colis->statut;
                $colis->update([
                    'statut'       => 'ANNULE',
                    'date_cloture' => now(),
                ]);
                $colis->synchroniserLivraisons();

                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $request->user()->agence_id,
                    'user_id'        => $request->user()->id,
                    'ancien_statut'  => $ancienStatut,
                    'nouveau_statut' => 'ANNULE',
                    'commentaire'    => 'Colis annulé par ' . $request->user()->nom,
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'Colis annulé.',
                'data'    => $colis->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /api/colis/{id}/changer-statut
     */
    public function changerStatut(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nouveau_statut' => ['required', Rule::in([
                'ENREGISTRE', 'EN_ATTENTE_PAIEMENT', 'PRET_EXPEDITION',
                'EN_TRANSIT', 'ARRIVE_AGENCE', 'EN_LIVRAISON',
                'LIVRE', 'RETIRE', 'ANNULE', 'PERDU', 'ENDOMMAGE', 'RETOUR',
            ])],
            'commentaire' => 'nullable|string|max:500',
            'agence_id'   => 'nullable|exists:agences,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            $user  = $request->user();
            $colis = Colis::findOrFail($id);

            DB::transaction(function () use ($colis, $request, $user) {
                $ancienStatut = $colis->statut;

                $colis->statut = $request->nouveau_statut;

                if (in_array($request->nouveau_statut, ['LIVRE', 'RETIRE', 'ANNULE', 'PERDU'])) {
                    $colis->date_cloture = now();
                }
                if ($request->nouveau_statut === 'ARRIVE_AGENCE') {
                    $colis->date_arrivee = now();
                }

                $colis->save();

                // Garde les livraisons cohérentes avec le nouveau statut du colis
                $colis->synchroniserLivraisons();

                HistoriqueColis::create([
                    'colis_id'       => $colis->id,
                    'agence_id'      => $request->agence_id ?? $user->agence_id,
                    'user_id'        => $user->id,
                    'ancien_statut'  => $ancienStatut,
                    'nouveau_statut' => $request->nouveau_statut,
                    'commentaire'    => $request->commentaire ?? 'Changement de statut',
                ]);

                Notification::creer(
                    null,
                    $colis->id,
                    'APPLICATION',
                    "Statut du colis {$colis->numero_suivi} : {$request->nouveau_statut}.",
                    'Mise à jour du colis'
                );

                JournalActivite::enregistrer(
                    'colis.changer_statut',
                    'colis',
                    $colis->id,
                    ['ancien_statut' => $ancienStatut, 'nouveau_statut' => $request->nouveau_statut],
                    $user
                );
            });

            return response()->json([
                'success' => true,
                'message' => 'Statut mis à jour.',
                'data'    => $colis->fresh(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/colis/form-data
     */
    public function formData(Request $request)
    {
        $user = $request->user();

        // Toutes les agences actives : utilisées comme destinations possibles.
        $toutesAgences = Agence::where('actif', true)
            ->orderBy('nom')
            ->get(['id', 'code', 'nom', 'type_agence', 'ville_id']);

        // Un agent ne peut déposer que dans son agence ; les admins voient tout.
        $agencesDepot = $toutesAgences;
        if (! $user->hasRole('SUPER_ADMIN') && ! $user->hasRole('ADMIN') && $user->agence_id) {
            $agencesDepot = $toutesAgences->where('id', $user->agence_id)->values();
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'agences'             => $agencesDepot,
                'agences_depot'       => $agencesDepot,
                'agences_destination' => $toutesAgences,
                'villes'              => Ville::where('actif', true)->orderBy('nom')->get(['id', 'nom', 'province_id']),
                'types_colis'        => TypeColis::where('actif', true)->orderBy('libelle')->get(['id', 'code', 'libelle', 'fragile']),
                'services_transport' => ServiceTransport::where('actif', true)->orderBy('libelle')->get(['id', 'code', 'libelle', 'delai_indicatif_jours']),
                'modes_facturation'  => ['PAYE_AU_DEPOT', 'PAYE_AU_RETRAIT'],
                'devises'            => Devise::where('actif', true)->get(['code', 'nom', 'symbole']),
                'statuts'            => [
                    'ENREGISTRE', 'EN_ATTENTE_PAIEMENT', 'PRET_EXPEDITION',
                    'EN_TRANSIT', 'ARRIVE_AGENCE', 'EN_LIVRAISON',
                    'LIVRE', 'RETIRE', 'ANNULE', 'PERDU', 'ENDOMMAGE', 'RETOUR',
                ],
            ],
        ]);
    }

    /**
     * POST /api/colis/{id}/upload-piece
     */
    public function uploadPiece(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'type_piece' => 'required|string|max:60',
            'fichier'    => 'required|file|max:10240', // 10 Mo
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $colis = Colis::findOrFail($id);
        $file  = $request->file('fichier');
        $path  = $file->store("colis/{$colis->id}", 'public');

        $piece = PieceJointeColis::create([
            'colis_id'       => $colis->id,
            'type_piece'     => $request->type_piece,
            'nom_fichier'    => $file->getClientOriginalName(),
            'chemin_fichier' => $path,
            'mime_type'      => $file->getMimeType(),
            'taille_octets'  => $file->getSize(),
            'ajoute_par'     => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pièce jointe ajoutée.',
            'data'    => $piece,
        ], 201);
    }

    /**
     * DELETE /api/colis/{id}/piece/{pieceId}
     */
    public function deletePiece($id, $pieceId)
    {
        $colis = Colis::findOrFail($id);
        $piece = PieceJointeColis::where('colis_id', $colis->id)->findOrFail($pieceId);

        Storage::disk('public')->delete($piece->chemin_fichier);
        $piece->delete();

        return response()->json(['success' => true, 'message' => 'Pièce jointe supprimée.']);
    }

    /**
     * GET /api/colis/{id}/bordereau
     */
    public function bordereau($id)
    {
        $colis = Colis::with([
            'agenceDepot', 'agenceDestination', 'villeDestination',
            'typeColis', 'service', 'clientExpediteur', 'facture',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data'    => [
                'colis'        => $colis,
                'montant_paye' => $colis->montant_paye,
                'solde'        => $colis->solde,
                'est_paye'     => $colis->estPaye(),
            ],
        ]);
    }

    /**
     * GET /api/colis/{id}/historique
     */
    public function historique($id)
    {
        $colis = Colis::findOrFail($id);

        $historique = $colis->historique()
            ->with('user:id,nom,prenom', 'agence:id,code,nom')
            ->orderByDesc('date_evenement')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $historique,
        ]);
    }
}