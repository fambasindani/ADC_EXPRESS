<?php

namespace App\Support;

use BaconQrCode\Common\ErrorCorrectionLevel;
use BaconQrCode\Encoder\Encoder;
use RuntimeException;

/**
 * Petit encodeur QR autonome (aucun service externe).
 *
 * Utilise bacon/bacon-qr-code pour calculer la matrice de modules, puis rend
 * lui-même le SVG ou le PNG : pas besoin d'Imagick, et le PNG ne requiert que
 * l'extension GD.
 */
class QrCode
{
    /**
     * Matrice de modules : true = module sombre.
     *
     * @return array<int, array<int, bool>>
     */
    public static function matrix(string $content): array
    {
        $qr     = Encoder::encode($content, ErrorCorrectionLevel::M());
        $matrix = $qr->getMatrix();
        $taille = $matrix->getWidth();

        $lignes = [];
        for ($y = 0; $y < $taille; $y++) {
            $ligne = [];
            for ($x = 0; $x < $taille; $x++) {
                $ligne[] = $matrix->get($x, $y) === 1;
            }
            $lignes[] = $ligne;
        }

        return $lignes;
    }

    /**
     * QR code au format SVG (net à l'impression, aucune dépendance).
     */
    public static function svg(string $content, int $taille = 240, int $marge = 4): string
    {
        $matrice = self::matrix($content);
        $modules = count($matrice);
        $total   = $modules + 2 * $marge;

        $chemins = [];
        foreach ($matrice as $y => $ligne) {
            foreach ($ligne as $x => $sombre) {
                if ($sombre) {
                    $chemins[] = 'M' . ($x + $marge) . ' ' . ($y + $marge) . 'h1v1h-1z';
                }
            }
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" width="' . $taille . '" height="' . $taille . '"'
            . ' viewBox="0 0 ' . $total . ' ' . $total . '" shape-rendering="crispEdges" role="img">'
            . '<rect width="' . $total . '" height="' . $total . '" fill="#ffffff"/>'
            . '<path d="' . implode('', $chemins) . '" fill="#000000"/>'
            . '</svg>';
    }

    /**
     * QR code au format PNG (imprimable et scannable par tous les lecteurs).
     *
     * @throws RuntimeException si l'extension GD n'est pas disponible
     */
    public static function png(string $content, int $taille = 480, int $marge = 4): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new RuntimeException("L'extension PHP GD est requise pour générer le QR code PNG.");
        }

        $matrice = self::matrix($content);
        $modules = count($matrice);
        $total   = $modules + 2 * $marge;
        $echelle = max(1, (int) floor($taille / $total));
        $pixels  = $total * $echelle;

        $image = imagecreatetruecolor($pixels, $pixels);
        $blanc = imagecolorallocate($image, 255, 255, 255);
        $noir  = imagecolorallocate($image, 0, 0, 0);
        imagefilledrectangle($image, 0, 0, $pixels - 1, $pixels - 1, $blanc);

        foreach ($matrice as $y => $ligne) {
            foreach ($ligne as $x => $sombre) {
                if (! $sombre) {
                    continue;
                }

                $x1 = ($x + $marge) * $echelle;
                $y1 = ($y + $marge) * $echelle;
                imagefilledrectangle($image, $x1, $y1, $x1 + $echelle - 1, $y1 + $echelle - 1, $noir);
            }
        }

        ob_start();
        imagepng($image);
        imagedestroy($image);

        return (string) ob_get_clean();
    }
}
