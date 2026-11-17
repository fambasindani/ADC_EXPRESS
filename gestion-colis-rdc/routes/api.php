<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CommuneController;
use App\Http\Controllers\Api\ProvinceController;
use App\Http\Controllers\Api\VilleController;
use App\Http\Controllers\Api\AgenceController;
use App\Http\Controllers\Api\DeviseController;
use App\Http\Controllers\Api\TypeColisController;
use App\Http\Controllers\Api\ServiceTransportController;
use App\Http\Controllers\Api\ModePaiementController;
use App\Http\Controllers\Api\ParametreController;
use App\Http\Controllers\Api\SequenceController;
use App\Http\Controllers\Api\TarifController;
use App\Http\Controllers\Api\CaisseController;
use App\Http\Controllers\Api\FactureController;
use App\Http\Controllers\Api\PaiementController;
use App\Http\Controllers\Api\RemboursementController;
use App\Http\Controllers\Api\ColisController;
use App\Http\Controllers\Api\ExpeditionController;
use App\Http\Controllers\Api\TransfertColisController;
use App\Http\Controllers\Api\HistoriqueColisController;
use App\Http\Controllers\Api\RetraitController;
use App\Http\Controllers\Api\LivraisonController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\OtpCodeController;
use App\Http\Controllers\Api\TrackingController;
use App\Http\Controllers\Api\JournauxActivitesController;
use App\Http\Controllers\Api\NotificationController;











     





/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});










// Routes publiques
Route::post('/login', [AuthController::class, 'login']);

// Suivi public d'un colis par numéro de suivi
Route::get('/suivi/{numero}', [TrackingController::class, 'suivre']);

// Routes protégées
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // OTP (sécurisation retrait / livraison / suivi)
    Route::post('/otp/generer',   [OtpCodeController::class, 'generer'])->middleware('permission:colis.update');
    Route::post('/otp/verifier',  [OtpCodeController::class, 'verifier'])->middleware('permission:colis.update');

    // Utilisateurs
    Route::get('/users/form-data', [UserController::class, 'formData'])->middleware('permission:users.view');
    Route::post('/users/{id}/assign-role', [UserController::class, 'assignRole'])->middleware('permission:users.update');
    Route::get('/users',         [UserController::class, 'index'])->middleware('permission:users.view');
    Route::get('/users/{id}',    [UserController::class, 'show'])->middleware('permission:users.view');
    Route::post('/users',        [UserController::class, 'store'])->middleware('permission:users.create');
    Route::put('/users/{id}',    [UserController::class, 'update'])->middleware('permission:users.update');
    Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

    // Rôles
    Route::get('/roles',         [RoleController::class, 'index'])->middleware('permission:roles.manage');
    Route::get('/roles/{id}',    [RoleController::class, 'show'])->middleware('permission:roles.manage');
    Route::post('/roles',        [RoleController::class, 'store'])->middleware('permission:roles.manage');
    Route::put('/roles/{id}',    [RoleController::class, 'update'])->middleware('permission:roles.manage');
    Route::delete('/roles/{id}', [RoleController::class, 'destroy'])->middleware('permission:roles.manage');
    Route::put('/roles/{id}/permissions', [RoleController::class, 'syncPermissions'])->middleware('permission:roles.manage');

    // Permissions
    Route::get('/permissions',      [PermissionController::class, 'index'])->middleware('permission:roles.manage');
    Route::get('/permissions/{id}', [PermissionController::class, 'show'])->middleware('permission:roles.manage');


    // Clients
Route::get('/clients/form-data', [ClientController::class, 'formData'])->middleware('permission:clients.view');
Route::get('/clients/{id}/colis', [ClientController::class, 'colis'])->middleware('permission:clients.view');
Route::get('/clients',         [ClientController::class, 'index'])->middleware('permission:clients.view');
Route::get('/clients/{id}',    [ClientController::class, 'show'])->middleware('permission:clients.view');
Route::post('/clients',        [ClientController::class, 'store'])->middleware('permission:clients.manage');
Route::put('/clients/{id}',    [ClientController::class, 'update'])->middleware('permission:clients.manage');
Route::delete('/clients/{id}', [ClientController::class, 'destroy'])->middleware('permission:clients.manage');


// Agences & localisation
Route::get('/agences/form-data', [AgenceController::class, 'formData'])->middleware('permission:agences.view');
Route::get('/agences/{id}/statistiques', [AgenceController::class, 'statistiques'])->middleware('permission:agences.view');
Route::get('/agences',         [AgenceController::class, 'index'])->middleware('permission:agences.view');
Route::get('/agences/{id}',    [AgenceController::class, 'show'])->middleware('permission:agences.view');
Route::post('/agences',        [AgenceController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/agences/{id}',    [AgenceController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/agences/{id}', [AgenceController::class, 'destroy'])->middleware('permission:agences.manage');


// --- Provinces ---
Route::get('/provinces',         [ProvinceController::class, 'index'])->middleware('permission:agences.view');
Route::get('/provinces/{id}',    [ProvinceController::class, 'show'])->middleware('permission:agences.view');
Route::post('/provinces',        [ProvinceController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/provinces/{id}',    [ProvinceController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/provinces/{id}', [ProvinceController::class, 'destroy'])->middleware('permission:agences.manage');

// --- Villes ---
Route::get('/villes',         [VilleController::class, 'index'])->middleware('permission:agences.view');
Route::get('/villes/{id}',    [VilleController::class, 'show'])->middleware('permission:agences.view');
Route::post('/villes',        [VilleController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/villes/{id}',    [VilleController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/villes/{id}', [VilleController::class, 'destroy'])->middleware('permission:agences.manage');

// --- Communes --- 
Route::get('/communes',         [CommuneController::class, 'index'])->middleware('permission:agences.view');
Route::get('/communes/{id}',    [CommuneController::class, 'show'])->middleware('permission:agences.view');
Route::post('/communes',        [CommuneController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/communes/{id}',    [CommuneController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/communes/{id}', [CommuneController::class, 'destroy'])->middleware('permission:agences.manage');



// --- Devises ---
Route::get('/devises',         [DeviseController::class, 'index'])->middleware('permission:agences.view');
Route::get('/devises/{code}',  [DeviseController::class, 'show'])->middleware('permission:agences.view');
Route::post('/devises',        [DeviseController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/devises/{code}',  [DeviseController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/devises/{code}', [DeviseController::class, 'destroy'])->middleware('permission:agences.manage');

// --- Types de colis ---
Route::get('/types-colis',         [TypeColisController::class, 'index'])->middleware('permission:colis.view');
Route::get('/types-colis/{id}',    [TypeColisController::class, 'show'])->middleware('permission:colis.view');
Route::post('/types-colis',        [TypeColisController::class, 'store'])->middleware('permission:colis.update');
Route::put('/types-colis/{id}',    [TypeColisController::class, 'update'])->middleware('permission:colis.update');
Route::delete('/types-colis/{id}', [TypeColisController::class, 'destroy'])->middleware('permission:colis.update');

// --- Services de transport ---
Route::get('/services-transport',         [ServiceTransportController::class, 'index'])->middleware('permission:agences.view');
Route::get('/services-transport/{id}',    [ServiceTransportController::class, 'show'])->middleware('permission:agences.view');
Route::post('/services-transport',        [ServiceTransportController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/services-transport/{id}',    [ServiceTransportController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/services-transport/{id}', [ServiceTransportController::class, 'destroy'])->middleware('permission:agences.manage');

// --- Modes de paiement ---
Route::get('/modes-paiement',         [ModePaiementController::class, 'index'])->middleware('permission:payments.view');
Route::get('/modes-paiement/{id}',    [ModePaiementController::class, 'show'])->middleware('permission:payments.view');
Route::post('/modes-paiement',        [ModePaiementController::class, 'store'])->middleware('permission:payments.collect');
Route::put('/modes-paiement/{id}',    [ModePaiementController::class, 'update'])->middleware('permission:payments.collect');
Route::delete('/modes-paiement/{id}', [ModePaiementController::class, 'destroy'])->middleware('permission:payments.collect');

// --- Paramètres ---
Route::get('/parametres',         [ParametreController::class, 'index'])->middleware('permission:roles.manage');
Route::get('/parametres/{id}',    [ParametreController::class, 'show'])->middleware('permission:roles.manage');
Route::post('/parametres',        [ParametreController::class, 'store'])->middleware('permission:roles.manage');
Route::put('/parametres/bulk',    [ParametreController::class, 'bulkUpdate'])->middleware('permission:roles.manage');
Route::put('/parametres/{id}',    [ParametreController::class, 'update'])->middleware('permission:roles.manage');
Route::delete('/parametres/{id}', [ParametreController::class, 'destroy'])->middleware('permission:roles.manage');

// --- Séquences ---
Route::get('/sequences',         [SequenceController::class, 'index'])->middleware('permission:roles.manage');
Route::get('/sequences/{nom}',   [SequenceController::class, 'show'])->middleware('permission:roles.manage');
Route::post('/sequences/{nom}/reset', [SequenceController::class, 'reset'])->middleware('permission:roles.manage');
Route::post('/sequences/{nom}/next',  [SequenceController::class, 'next'])->middleware('permission:roles.manage');





// --- Tarifs (routes spécifiques d'abord) ---
Route::get('/tarifs/form-data', [TarifController::class, 'formData'])->middleware('permission:agences.view');
Route::post('/tarifs/calculer', [TarifController::class, 'calculer'])->middleware('permission:colis.view');
Route::get('/tarifs/route/{agenceOrigineId}/{agenceDestinationId}', [TarifController::class, 'byRoute'])->middleware('permission:colis.view');

// --- CRUD Tarifs ---
Route::get('/tarifs',         [TarifController::class, 'index'])->middleware('permission:agences.view');
Route::get('/tarifs/{id}',    [TarifController::class, 'show'])->middleware('permission:agences.view');
Route::post('/tarifs',        [TarifController::class, 'store'])->middleware('permission:agences.manage');
Route::put('/tarifs/{id}',    [TarifController::class, 'update'])->middleware('permission:agences.manage');
Route::delete('/tarifs/{id}', [TarifController::class, 'destroy'])->middleware('permission:agences.manage');




// --- Caisses (routes spécifiques d'abord) ---
Route::get('/caisses/form-data', [CaisseController::class, 'formData'])->middleware('permission:payments.view');
Route::get('/caisses/{id}/mouvements', [CaisseController::class, 'mouvements'])->middleware('permission:payments.view');
Route::get('/caisses/{id}/solde', [CaisseController::class, 'solde'])->middleware('permission:payments.view');

// --- CRUD Caisses ---
Route::get('/caisses',         [CaisseController::class, 'index'])->middleware('permission:payments.view');
Route::get('/caisses/{id}',    [CaisseController::class, 'show'])->middleware('permission:payments.view');
Route::post('/caisses',        [CaisseController::class, 'store'])->middleware('permission:payments.collect');
Route::put('/caisses/{id}',    [CaisseController::class, 'update'])->middleware('permission:payments.collect');
Route::delete('/caisses/{id}', [CaisseController::class, 'destroy'])->middleware('permission:payments.collect');


// --- Factures (routes spécifiques d'abord) ---
Route::get('/factures/stats', [FactureController::class, 'stats'])->middleware('permission:payments.view');
Route::get('/factures/par-colis/{colisId}', [FactureController::class, 'parColis'])->middleware('permission:payments.view');
Route::get('/factures/{id}/paiements', [FactureController::class, 'paiements'])->middleware('permission:payments.view');
Route::post('/factures/{id}/recalculer', [FactureController::class, 'recalculerStatut'])->middleware('permission:payments.collect');

// --- CRUD Factures ---
Route::get('/factures',         [FactureController::class, 'index'])->middleware('permission:payments.view');
Route::get('/factures/{id}',    [FactureController::class, 'show'])->middleware('permission:payments.view');
Route::post('/factures',        [FactureController::class, 'store'])->middleware('permission:payments.collect');
Route::put('/factures/{id}',    [FactureController::class, 'update'])->middleware('permission:payments.collect');
Route::delete('/factures/{id}', [FactureController::class, 'destroy'])->middleware('permission:payments.collect');


// --- Paiements (routes spécifiques d'abord) ---
Route::get('/paiements/form-data', [PaiementController::class, 'formData'])->middleware('permission:payments.collect');
Route::get('/paiements/stats', [PaiementController::class, 'stats'])->middleware('permission:payments.view');
Route::get('/paiements/par-colis/{colisId}', [PaiementController::class, 'parColis'])->middleware('permission:payments.view');
Route::get('/paiements/{id}/recu', [PaiementController::class, 'recu'])->middleware('permission:payments.view');

// --- CRUD Paiements ---
Route::get('/paiements',         [PaiementController::class, 'index'])->middleware('permission:payments.view');
Route::get('/paiements/{id}',    [PaiementController::class, 'show'])->middleware('permission:payments.view');
Route::post('/paiements',        [PaiementController::class, 'store'])->middleware('permission:payments.collect');
Route::put('/paiements/{id}',    [PaiementController::class, 'update'])->middleware('permission:payments.collect');
Route::delete('/paiements/{id}', [PaiementController::class, 'destroy'])->middleware('permission:payments.collect');



// --- Remboursements (routes spécifiques d'abord) ---
Route::get('/remboursements/stats', [RemboursementController::class, 'stats'])->middleware('permission:payments.view');
Route::get('/remboursements/par-paiement/{paiementId}', [RemboursementController::class, 'parPaiement'])->middleware('permission:payments.view');
Route::post('/remboursements/{id}/valider', [RemboursementController::class, 'valider'])->middleware('permission:payments.refund');
Route::post('/remboursements/{id}/rejeter', [RemboursementController::class, 'rejeter'])->middleware('permission:payments.refund');
Route::post('/remboursements/{id}/effectuer', [RemboursementController::class, 'effectuer'])->middleware('permission:payments.refund');

// --- CRUD Remboursements ---
Route::get('/remboursements',         [RemboursementController::class, 'index'])->middleware('permission:payments.view');
Route::get('/remboursements/{id}',    [RemboursementController::class, 'show'])->middleware('permission:payments.view');
Route::post('/remboursements',        [RemboursementController::class, 'store'])->middleware('permission:payments.refund');
Route::put('/remboursements/{id}',    [RemboursementController::class, 'update'])->middleware('permission:payments.refund');
Route::delete('/remboursements/{id}', [RemboursementController::class, 'destroy'])->middleware('permission:payments.refund');




// --- Colis (routes spécifiques d'abord) ---
Route::get('/colis/form-data', [ColisController::class, 'formData'])->middleware('permission:colis.create');
Route::get('/colis/{id}/bordereau', [ColisController::class, 'bordereau'])->middleware('permission:colis.view');
Route::get('/colis/{id}/historique', [ColisController::class, 'historique'])->middleware('permission:colis.view');
Route::post('/colis/{id}/changer-statut', [ColisController::class, 'changerStatut'])->middleware('permission:colis.update');
Route::post('/colis/{id}/upload-piece', [ColisController::class, 'uploadPiece'])->middleware('permission:colis.update');
Route::delete('/colis/{id}/piece/{pieceId}', [ColisController::class, 'deletePiece'])->middleware('permission:colis.update');

// --- CRUD Colis ---
Route::get('/colis',         [ColisController::class, 'index'])->middleware('permission:colis.view');
Route::get('/colis/{id}',    [ColisController::class, 'show'])->middleware('permission:colis.view');
Route::post('/colis',        [ColisController::class, 'store'])->middleware('permission:colis.create');
Route::put('/colis/{id}',    [ColisController::class, 'update'])->middleware('permission:colis.update');
Route::delete('/colis/{id}', [ColisController::class, 'destroy'])->middleware('permission:colis.cancel');



// --- Expéditions (routes spécifiques d'abord) ---
Route::get('/expeditions/form-data', [ExpeditionController::class, 'formData'])->middleware('permission:expeditions.manage');
Route::get('/expeditions/{id}/colis', [ExpeditionController::class, 'colis'])->middleware('permission:expeditions.manage');
Route::get('/expeditions/{id}/colis-disponibles', [ExpeditionController::class, 'colisDisponibles'])->middleware('permission:expeditions.manage');
Route::post('/expeditions/{id}/charger-colis', [ExpeditionController::class, 'chargerColis'])->middleware('permission:expeditions.manage');
Route::post('/expeditions/{id}/decharger-colis', [ExpeditionController::class, 'dechargerColis'])->middleware('permission:expeditions.manage');
Route::post('/expeditions/{id}/demarrer', [ExpeditionController::class, 'demarrer'])->middleware('permission:expeditions.manage');
Route::post('/expeditions/{id}/arriver', [ExpeditionController::class, 'arriver'])->middleware('permission:expeditions.manage');
Route::post('/expeditions/{id}/annuler', [ExpeditionController::class, 'annuler'])->middleware('permission:expeditions.manage');

// --- CRUD Expéditions ---
Route::get('/expeditions',         [ExpeditionController::class, 'index'])->middleware('permission:expeditions.manage');
Route::get('/expeditions/{id}',    [ExpeditionController::class, 'show'])->middleware('permission:expeditions.manage');
Route::post('/expeditions',        [ExpeditionController::class, 'store'])->middleware('permission:expeditions.manage');
Route::put('/expeditions/{id}',    [ExpeditionController::class, 'update'])->middleware('permission:expeditions.manage');
Route::delete('/expeditions/{id}', [ExpeditionController::class, 'destroy'])->middleware('permission:expeditions.manage');



// --- Transferts (routes spécifiques d'abord) ---
Route::get('/transferts/form-data', [TransfertColisController::class, 'formData'])->middleware('permission:transfers.manage');
Route::get('/transferts/colis-disponibles', [TransfertColisController::class, 'colisDisponibles'])->middleware('permission:transfers.manage');
Route::get('/transferts/par-colis/{colisId}', [TransfertColisController::class, 'parColis'])->middleware('permission:transfers.manage');
Route::get('/transferts/en-attente-reception', [TransfertColisController::class, 'enAttenteReception'])->middleware('permission:transfers.manage');
Route::post('/transferts/{id}/expedier', [TransfertColisController::class, 'expedier'])->middleware('permission:transfers.manage');
Route::post('/transferts/{id}/recevoir', [TransfertColisController::class, 'recevoir'])->middleware('permission:transfers.manage');

// --- CRUD Transferts ---
Route::get('/transferts',         [TransfertColisController::class, 'index'])->middleware('permission:transfers.manage');
Route::get('/transferts/{id}',    [TransfertColisController::class, 'show'])->middleware('permission:transfers.manage');
Route::post('/transferts',        [TransfertColisController::class, 'store'])->middleware('permission:transfers.manage');
Route::put('/transferts/{id}',    [TransfertColisController::class, 'update'])->middleware('permission:transfers.manage');
Route::delete('/transferts/{id}', [TransfertColisController::class, 'destroy'])->middleware('permission:transfers.manage');



Route::get('/historique/stats', [HistoriqueColisController::class, 'stats'])->middleware('permission:colis.view');
Route::get('/historique/timeline/{colisId}', [HistoriqueColisController::class, 'timeline'])->middleware('permission:colis.view');
Route::get('/historique', [HistoriqueColisController::class, 'index'])->middleware('permission:colis.view');
Route::get('/historique/{id}', [HistoriqueColisController::class, 'show'])->middleware('permission:colis.view');
Route::post('/historique', [HistoriqueColisController::class, 'store'])->middleware('permission:colis.update');
Route::put('/historique/{id}', [HistoriqueColisController::class, 'update'])->middleware('permission:colis.update');
Route::delete('/historique/{id}', [HistoriqueColisController::class, 'destroy'])->middleware('permission:colis.update');


Route::get('/retraits/form-data', [RetraitController::class, 'formData'])->middleware('permission:withdrawals.manage');
Route::get('/retraits/eligibles', [RetraitController::class, 'eligibles'])->middleware('permission:withdrawals.manage');
Route::get('/retraits/stats', [RetraitController::class, 'stats'])->middleware('permission:withdrawals.manage');
Route::get('/retraits/par-colis/{colisId}', [RetraitController::class, 'parColis'])->middleware('permission:withdrawals.manage');
Route::get('/retraits', [RetraitController::class, 'index'])->middleware('permission:withdrawals.manage');
Route::get('/retraits/{id}', [RetraitController::class, 'show'])->middleware('permission:withdrawals.manage');
Route::post('/retraits', [RetraitController::class, 'store'])->middleware('permission:withdrawals.manage');


Route::get('/livraisons/form-data', [LivraisonController::class, 'formData'])->middleware('permission:deliveries.manage');
Route::get('/livraisons/colis-disponibles', [LivraisonController::class, 'colisDisponibles'])->middleware('permission:deliveries.manage');
Route::get('/livraisons/stats', [LivraisonController::class, 'stats'])->middleware('permission:deliveries.manage');
Route::get('/livraisons/mes-livraisons', [LivraisonController::class, 'mesLivraisons'])->middleware('permission:deliveries.manage');
Route::post('/livraisons/{id}/tenter', [LivraisonController::class, 'tenter'])->middleware('permission:deliveries.manage');
Route::post('/livraisons/{id}/marquer-echec', [LivraisonController::class, 'marquerEchec'])->middleware('permission:deliveries.manage');
Route::post('/livraisons/{id}/reprogrammer', [LivraisonController::class, 'reprogrammer'])->middleware('permission:deliveries.manage');
Route::post('/livraisons/{id}/livrer', [LivraisonController::class, 'livrer'])->middleware('permission:deliveries.manage');
Route::get('/livraisons', [LivraisonController::class, 'index'])->middleware('permission:deliveries.manage');
Route::get('/livraisons/{id}', [LivraisonController::class, 'show'])->middleware('permission:deliveries.manage');
Route::post('/livraisons', [LivraisonController::class, 'store'])->middleware('permission:deliveries.manage');
Route::put('/livraisons/{id}', [LivraisonController::class, 'update'])->middleware('permission:deliveries.manage');
Route::delete('/livraisons/{id}', [LivraisonController::class, 'destroy'])->middleware('permission:deliveries.manage');



// --- Journal d'activités (audit) ---
Route::get('/journaux-activites', [JournauxActivitesController::class, 'index'])->middleware('permission:users.view');

// --- Notifications ---
Route::get('/notifications', [NotificationController::class, 'index'])->middleware('permission:users.view');


// --- Dashboard ---
Route::prefix('dashboard')->middleware('permission:dashboard.view')->group(function () {
    Route::get('/stats',            [DashboardController::class, 'stats']);
    Route::get('/charts',           [DashboardController::class, 'charts']);
    Route::get('/top-agences',      [DashboardController::class, 'topAgences'])->middleware('permission:reports.view');
    Route::get('/top-livreurs',     [DashboardController::class, 'topLivreurs']);
    Route::get('/alertes',          [DashboardController::class, 'alertes']);
    Route::get('/activite-recente', [DashboardController::class, 'activiteRecente']);
    Route::get('/performance',      [DashboardController::class, 'performance']);
    Route::get('/agence/{id}',      [DashboardController::class, 'agence']);
});




















});
