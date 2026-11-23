<?php

namespace App\Support;

use App\Models\Parametre;
use GuzzleHttp\Client;

/**
 * Envoi de messages WhatsApp.
 *
 * Deux modes :
 *  - Cloud API (Meta) : envoi automatique si WHATSAPP_TOKEN et
 *    WHATSAPP_PHONE_NUMBER_ID sont configurés.
 *  - Click-to-chat (wa.me) : en repli, ouvre WhatsApp avec un message
 *    pré-rempli (l'utilisateur doit cliquer « Envoyer »).
 *
 * Le numéro émetteur est configurable via le paramètre `whatsapp_numero`.
 */
class WhatsApp
{
    public static function numero(): string
    {
        return trim((string) Parametre::get('whatsapp_numero', '+243898596501'));
    }

    /** Vrai si l'envoi automatique via la Cloud API est configuré. */
    public static function estConfigure(): bool
    {
        return (bool) config('whatsapp.token') && (bool) config('whatsapp.phone_number_id');
    }

    /**
     * Envoi automatique d'un message via la Cloud API.
     *
     * @return array{envoye: bool, message_id?: string|null, erreur?: string}
     */
    public static function envoyer(string $destinataire, string $message): array
    {
        if (! self::estConfigure()) {
            return [
                'envoye' => false,
                'erreur' => 'WhatsApp Cloud API non configurée (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).',
            ];
        }

        $dest = self::normaliser($destinataire);
        if ($dest === '') {
            $dest = self::normaliser(self::numero());
        }

        try {
            $client = new Client();

            $reponse = $client->post(sprintf(
                'https://graph.facebook.com/%s/%s/messages',
                config('whatsapp.version', 'v19.0'),
                config('whatsapp.phone_number_id')
            ), [
                'headers' => [
                    'Authorization' => 'Bearer ' . config('whatsapp.token'),
                    'Content-Type'  => 'application/json',
                ],
                'json' => [
                    'messaging_product' => 'whatsapp',
                    'to'                => $dest,
                    'type'              => 'text',
                    'text'              => ['body' => $message],
                ],
                'timeout' => 15,
            ]);

            $body = json_decode((string) $reponse->getBody(), true);

            if ($reponse->getStatusCode() >= 200 && $reponse->getStatusCode() < 300) {
                return [
                    'envoye'     => true,
                    'message_id' => $body['messages'][0]['id'] ?? null,
                ];
            }

            return [
                'envoye' => false,
                'erreur' => $body['error']['message'] ?? 'Erreur inconnue lors de l\'envoi.',
            ];
        } catch (\Throwable $e) {
            return ['envoye' => false, 'erreur' => $e->getMessage()];
        }
    }

    /**
     * URL click-to-chat. Si aucun destinataire n'est fourni, le numéro
     * configuré est utilisé en repli.
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
