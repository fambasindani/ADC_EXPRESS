<?php

return [
    /*
    |--------------------------------------------------------------------------
    | WhatsApp Business Cloud API (Meta)
    |--------------------------------------------------------------------------
    | Permet l'envoi automatique de messages WhatsApp (sans intervention
    | manuelle). Renseignez le jeton et l'ID du numéro obtenus sur
    | developers.facebook.com > WhatsApp > Configuration.
    |
    | Si non renseignés, l'application retombe sur le click-to-chat (wa.me).
    |
    */

    'token'          => env('WHATSAPP_TOKEN'),
    'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
    'version'        => env('WHATSAPP_API_VERSION', 'v19.0'),
];
