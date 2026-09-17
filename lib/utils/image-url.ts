// Helpers d'optimisation d'URL pour les CDN d'images supportés
// (Cloudinary, Cloudflare Images). Permet de servir AVIF/WebP + redimensionnement
// sans toucher au composant qui consomme l'URL (utile pour les images CSS
// `background-image:` qui ne peuvent pas passer par next/image).

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDFLARE_HOST = 'imagedelivery.net';

/**
 * Format de sortie forcé. `'auto'` laisse Cloudinary négocier (`f_auto`).
 *
 * ⚠️ Mesuré en prod le 2026-07-19 : `f_auto` NE négocie PAS sur ce compte —
 * il renvoie du JPEG même avec `Accept: image/avif,image/webp` et un UA mobile
 * réel (58,6 Ko en JPEG vs 44,9 Ko en AVIF forcé sur le hero). Pour les images
 * où le poids compte (élément LCP), forcer `'avif'` et fournir un fallback via
 * un `<source type="image/avif">` dans un `<picture>` — ne JAMAIS servir de
 * l'AVIF forcé sans fallback (Safari < 16.4, Firefox < 93 ne le lisent pas).
 */
export type ImageFormat = 'auto' | 'avif' | 'webp';

/**
 * Réécrit une URL Cloudinary en y injectant les transforms standards
 * (`f_auto` pour AVIF/WebP, `q_auto:<level>` pour la qualité adaptative,
 * `w_<width>` pour le redimensionnement). Si l'URL contient déjà des
 * transforms, ne fait rien. Renvoie l'URL telle quelle si ce n'est pas
 * une URL Cloudinary.
 *
 * `quality` :
 *   - 'good' (default) : `q_auto:good` — meilleur équilibre qualité/poids
 *   - 'eco' : `q_auto:eco` — compression plus agressive (~30% de gain)
 *     adapté aux images de liste / cards où la qualité parfaite n'est pas critique
 *   - 'best' : `q_auto:best` — pour hero / images mises en avant
 */
export function optimizeCloudinaryUrl(
  url: string,
  width?: number,
  quality: 'eco' | 'good' | 'best' = 'good',
  format?: ImageFormat,
): string {
  if (!url || !url.includes(CLOUDINARY_HOST)) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const after = url.slice(idx + marker.length);

  // Détecte si le 1er segment est un bloc de transforms (commence par
  // 2 chars + underscore type `c_`, `w_`, `f_`...). Si oui, on MERGE
  // f_auto / q_auto / w_* dedans plutôt que de skip — sinon les images
  // uploadées avec un preset (genre `c_fill,w_400`) restent en JPG.
  const firstSlash = after.indexOf('/');
  const firstSegment = firstSlash === -1 ? '' : after.slice(0, firstSlash);
  const restAfterTransforms = firstSlash === -1 ? after : after.slice(firstSlash + 1);
  const hasTransforms = /^[a-z]_[^/]+/.test(firstSegment);

  const existing = hasTransforms ? firstSegment.split(',') : [];
  const has = (prefix: string) => existing.some((t) => t.startsWith(prefix));

  const transforms = [...existing];
  // Ne touche pas à un format explicite (`f_jpg`, `f_webp`) imposé par l'admin.
  if (!has('f_')) transforms.push(`f_${format ?? 'auto'}`);
  if (!has('q_')) transforms.push(`q_auto:${quality}`);
  if (width && !has('w_')) transforms.push(`w_${width}`);

  const tail = hasTransforms ? restAfterTransforms : after;
  return url.slice(0, idx + marker.length) + transforms.join(',') + '/' + tail;
}

/**
 * Variante pour Cloudflare Images : remplace le dernier segment (variant) par
 * un variant spécifique. Cloudflare gère f_auto par défaut via le variant.
 * URL type : https://imagedelivery.net/{accountHash}/{imageId}/{variant}
 */
export function withCloudflareVariant(url: string, variant: string): string {
  if (!url || !url.includes(CLOUDFLARE_HOST)) return url;
  return url.replace(/\/[^/]+$/, `/${variant}`);
}

/**
 * Optimisation générique d'une URL d'image : détecte le CDN et applique la
 * bonne stratégie. Sûre à appeler sur n'importe quelle URL (no-op si CDN
 * inconnu).
 *
 * ⚠️ Ne fait rien sur une URL Cloudflare Images. Les URLs de livraison
 * Cloudflare se terminent par un **variant nommé** (`/public`), configuré dans
 * leur dashboard : on ne peut pas y injecter une largeur arbitraire sans savoir
 * si l'option « flexible variants » est activée sur le compte — et si elle ne
 * l'est pas, l'URL renvoie une erreur, donc une image cassée. Au 2026-09-17 la
 * production ne sert que du Cloudinary (vérifié en grepant le HTML servi), donc
 * la question ne se pose pas encore. Le jour où `ImageUploader` aura déposé des
 * images Cloudflare, utiliser `withCloudflareVariant` avec un variant
 * réellement créé côté Cloudflare.
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  quality: 'eco' | 'good' | 'best' = 'good',
  format?: ImageFormat,
): string {
  if (!url) return url;
  if (url.includes(CLOUDINARY_HOST)) return optimizeCloudinaryUrl(url, width, quality, format);
  return url;
}

/**
 * Échelle de largeurs autorisées.
 *
 * Coût (règle n°2) : chaque largeur DISTINCTE demandée à Cloudinary crée un
 * dérivé, et le compte gratuit compte les transformations. Si on passait
 * bêtement la taille CSS de chaque composant (28, 36, 40, 48, 56, 64, 80…),
 * une même photo finirait déclinée en dix versions pour trois pixels d'écart.
 * On arrondit donc à la largeur supérieure de cette liste : le nombre de
 * dérivés reste borné, et le cache CDN est partagé entre les écrans.
 */
const WIDTH_STEPS = [64, 96, 128, 192, 256, 384, 512, 768, 1024, 1600] as const;

function snapWidth(width: number): number {
  return WIDTH_STEPS.find((step) => step >= width) ?? WIDTH_STEPS[WIDTH_STEPS.length - 1];
}

/**
 * URL d'une image affichée en petit (avatar, logo de liste, vignette).
 *
 * `cssSize` est la taille d'AFFICHAGE en pixels CSS ; la largeur demandée au
 * CDN est doublée pour rester nette sur un écran à densité 2×, puis arrondie à
 * l'échelle ci-dessus.
 *
 * Pourquoi ça existe : les photos arrivent en pleine résolution (447×544 et
 * 31 Ko mesurés sur une photo du bureau le 2026-09-17) et étaient servies
 * telles quelles dans des pastilles de 36 px. La même photo en `w_160` pèse
 * 2,7 Ko — 92 % de moins.
 *
 * Qualité `eco` par défaut : à cette taille d'affichage la compression
 * agressive est invisible.
 */
export function thumbnailUrl(
  url: string,
  cssSize: number,
  quality: 'eco' | 'good' | 'best' = 'eco',
): string {
  if (!url) return url;
  return optimizeImageUrl(url, snapWidth(Math.round(cssSize * 2)), quality);
}
