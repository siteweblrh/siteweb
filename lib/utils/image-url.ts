// Helpers d'optimisation d'URL pour les CDN d'images supportés
// (Cloudinary, Cloudflare Images). Permet de servir AVIF/WebP + redimensionnement
// sans toucher au composant qui consomme l'URL (utile pour les images CSS
// `background-image:` qui ne peuvent pas passer par next/image).

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDFLARE_HOST = 'imagedelivery.net';

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
  if (!has('f_')) transforms.push('f_auto');
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
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  quality: 'eco' | 'good' | 'best' = 'good',
): string {
  if (!url) return url;
  if (url.includes(CLOUDINARY_HOST)) return optimizeCloudinaryUrl(url, width, quality);
  return url;
}
