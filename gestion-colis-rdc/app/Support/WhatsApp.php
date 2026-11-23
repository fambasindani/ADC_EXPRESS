<?php

namespace App\Support;

use App\Models\Parametre;

/**
 * Envoi de messages WhatsApp (click-to-chat, sans gateway).
 *
 * Le numéro émetteur est configurable via le paramètre `whatsapp_numero`
 * (page Paramètres Globaux). `lien()` construit une URL wa.me qui ouvre
 * WhatsApp avec un message pré-rempli destiné au client.
 */
class WhatsApp
{
    public static function numero(): string
    {
        return trim((string) Parametre::get('whatsapp_numero', '+243898596501'));
    }

    /**
     * URL click-to-chat. Si aucun destinataire n'est fourni, le numéro
     * configuré est utilisé en repli. Les numéros locaux (ex. 089...) sont
     * convertis en format international 243...
     */
    public static function lien(string $destinataire, string $message): string
    {
        $dest = self::normaliser($destinataire);

        if ($dest === '') {
            $dest = self::normaliser(self::numero());
        }

        return 'https://wa.me/' . $dest . '?text=' . rawurlencode($message);
    }

    private static function normaliser(string $numero): string
    {
        $n = preg_replace('/\D/', '', $numero);

        if (str_starts_with($n, '00')) {
            return substr($n, 2);
        }

        if (str_starts_with($n, '0')) {
            return '243' . substr($n, 1);
        }

        return $n;
    }
}
