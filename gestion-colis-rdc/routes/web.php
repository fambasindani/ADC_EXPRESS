<?php

use App\Http\Controllers\Web\SuiviPublicController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

/*
| Suivi public : cible du QR code collé sur le colis. Aucune donnée
| sensible (téléphone, adresse, montants) n'est exposée.
*/
Route::get('/suivi/{numero}', [SuiviPublicController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('suivi.public');
