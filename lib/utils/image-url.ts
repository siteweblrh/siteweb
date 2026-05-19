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
  // Si l'URL contient déjà des transforms (segment avant le public_id qui
  // commence par une lettre clé Cloudinary type `c_`, `f_`, `q_`, `w_`, etc.),
  // on suppose que l'admin a déjà configuré ce qu'il faut.
  if (/^[a-z]_[^/]+/.test(after)) return url;
  const transforms = ['f_auto', `q_auto:${quality}`];
  if (width) transforms.push(`w_${width}`);
  return url.slice(0, idx + marker.length) + transforms.join(',') + '/' + after;
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
