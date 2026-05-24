/**
 * Rasterisation SVG → PNG via sharp. Indispensable pour passer des SVGs
 * complexes à Satori, qui n'a qu'un support partiel de SVG (paths simples
 * OK, mais filter/mask/clip-path/text problématiques + risque de crash
 * silencieux sur certaines structures).
 *
 * Convertir en PNG en amont = élimine tous ces écueils. Coût ~10-50ms
 * par asset par cold start (caché en module Map ensuite).
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PNG_CACHE = new Map<string, string>();

/**
 * Rasterise un fichier SVG (depuis `/public`) en PNG, à la largeur cible
 * `widthPx`. Hauteur calculée automatiquement par sharp pour préserver
 * le ratio.
 *
 * `transformSvg` permet de modifier le SVG string avant rasterisation
 * (utile pour stripper du contenu ou changer une couleur de fill).
 *
 * Retourne une data URI PNG prête pour `<img src="...">` dans Satori.
 */
export async function rasterizeSvgToPngDataUri(
  publicPath: string,
  widthPx: number,
  transformSvg?: (svg: string) => string,
): Promise<string> {
  const cacheKey = `${publicPath}@${widthPx}@${transformSvg ? 'tx' : 'raw'}`;
  const cached = PNG_CACHE.get(cacheKey);
  if (cached) return cached;

  const absPath = path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
  const rawSvg = fs.readFileSync(absPath, 'utf8');
  const finalSvg = transformSvg ? transformSvg(rawSvg) : rawSvg;

  try {
    const pngBuffer = await sharp(Buffer.from(finalSvg))
      .resize({ width: widthPx, withoutEnlargement: false })
      .png({ compressionLevel: 6, palette: false })
      .toBuffer();

    const uri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    PNG_CACHE.set(cacheKey, uri);
    console.log(`[social-poster] rasterized ${publicPath} → ${(pngBuffer.length / 1024).toFixed(1)}KB PNG`);
    return uri;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error(`[social-poster] sharp rasterization FAILED for ${publicPath}: ${message}`);
    // Fallback : on retourne le SVG brut en data URI. Satori tentera de le
    // parser lui-même — peut planter ou rendre partiellement, mais au moins
    // on ne casse pas tout le poster.
    const fallback = `data:image/svg+xml;base64,${Buffer.from(finalSvg).toString('base64')}`;
    PNG_CACHE.set(cacheKey, fallback);
    return fallback;
  }
}
