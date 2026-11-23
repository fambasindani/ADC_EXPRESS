<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Colis;
use App\Models\OtpCode;
use App\Support\WhatsApp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class OtpCodeController extends Controller
{
    /**
     * POST /api/otp/generer
     * Génère un code OTP à usage unique pour sécuriser retrait / livraison / suivi.
     */
    public function generer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'  => 'required|exists:colis,id',
            'usage_otp' => ['required', Rule::in(['RETRAIT', 'LIVRAISON', 'SUIVI'])],
            'telephone' => 'required|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $colis = Colis::findOrFail($request->colis_id);
        $code  = (string) random_int(100000, 999999);

        // Invalide les OTP non utilisés du même usage
        OtpCode::where('colis_id', $colis->id)
            ->where('usage_otp', $request->usage_otp)
            ->where('utilise', false)
            ->update(['utilise' => true]);

        $otp = OtpCode::create([
            'colis_id'  => $colis->id,
            'telephone' => $request->telephone,
            'code_hash' => Hash::make($code),
            'usage_otp' => $request->usage_otp,
            'expire_at' => now()->addMinutes(10),
            'utilise'   => false,
        ]);

        // Envoi automatique du code par WhatsApp (Cloud API) si configuré ;
        // sinon le code reste affiché dans la réponse (mode développement).
        $whatsapp = WhatsApp::envoyer(
            $request->telephone,
            "Votre code de sécurité ADC EXPRESS : {$code}. Valable 10 minutes."
        );

        return response()->json([
            'success' => true,
            'message' => 'Code OTP généré.',
            'data'    => [
                'otp_id'    => $otp->id,
                'telephone' => $otp->telephone,
                'usage_otp' => $otp->usage_otp,
                'expire_at' => $otp->expire_at,
                'code'      => $code,
                'whatsapp'  => $whatsapp,
            ],
        ], 201);
    }

    /**
     * POST /api/otp/verifier
     * Vérifie et consomme un code OTP.
     */
    public function verifier(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colis_id'  => 'required|exists:colis,id',
            'usage_otp' => ['required', Rule::in(['RETRAIT', 'LIVRAISON', 'SUIVI'])],
            'code'      => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        if (! OtpCode::verifier($request->colis_id, $request->usage_otp, $request->code)) {
            return response()->json([
                'success' => false,
                'message' => 'Code OTP invalide ou expiré.',
            ], 422);
        }

        return response()->json(['success' => true, 'message' => 'Code OTP vérifié.']);
    }
}
