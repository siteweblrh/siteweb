/**
 * Helpers pour servir les assets statiques (textures, silhouettes, logos clubs,
 * badge LRH) à Satori.
 *
 * Satori accepte les `<img src="…" />` en HTTP absolu OU en data: URI.
 * En production, on utilise l'URL absolue du site (servie par Vercel CDN).
 * En dev / preview, on lit le fichier depuis le filesystem et on le passe en
 * base64 (pour éviter la dépendance à un serveur qui tourne).
 *
 * Pour les fichiers SVG, on FORCE le mode data URI : Satori parse mieux les
 * SVGs petits inlinés que via fetch HTTP (moins de surprise CORS/parse).
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Construit une URL absolue depuis un chemin public-relative (`/social/x.png`).
 * Utilisé pour les images bitmap (PNG, JPG) qu'on veut laisser le CDN servir.
 */
export function publicAbsoluteUrl(publicPath: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  return base + (publicPath.startsWith('/') ? publicPath : '/' + publicPath);
}

const DATA_URI_CACHE = new Map<string, string>();

/**
 * Lit un fichier depuis `/public` et retourne une data URI. Cache module-level
 * (idempotent par cold start de la Lambda).
 *
 * Préférer cette méthode pour : badge LRH, silhouettes, petits SVGs.
 * Pour les grosses textures (>100 KB), `publicAbsoluteUrl` est plus efficace
 * (CDN-cached, pas de payload dans la response Satori).
 */
export function publicFileAsDataUri(publicPath: string, mimeType: string): string {
  const cached = DATA_URI_CACHE.get(publicPath);
  if (cached) return cached;

  const absPath = path.join(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
  const buf = fs.readFileSync(absPath);
  const uri = `data:${mimeType};base64,${buf.toString('base64')}`;
  DATA_URI_CACHE.set(publicPath, uri);
  return uri;
}

/**
 * Sélectionne une silhouette de hockeyeur au hasard parmi les 4 disponibles.
 * Stable pour un même `seed` (typiquement matchId) → l'affiche du même match
 * affiche toujours la même silhouette entre 2 régénérations.
 *
 * Note : le dossier s'appelle `silouhettes` (typo orig.) dans le repo.
 */
const SILHOUETTES = [
  '/social/silouhettes/en-course-1.svg',
  '/social/silouhettes/en-course-2.svg',
  '/social/silouhettes/frappe.svg',
  '/social/silouhettes/gardien.svg',
] as const;

export function pickSilhouette(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SILHOUETTES.length;
  return publicFileAsDataUri(SILHOUETTES[idx], 'image/svg+xml');
}

/**
 * Badge officiel LRH (logo carré navy/rouge/or). Toujours embedded en
 * data URI pour garantir le rendu Satori (le SVG contient des éléments
 * complexes que le parser HTTP de Satori pourrait choker).
 */
export function lrhBadgeDataUri(): string {
  return publicFileAsDataUri('/assets/badge-lrh.svg', 'image/svg+xml');
}

/**
 * Logo d'un club. Si l'URL est déjà absolue (CDN Cloudinary/Cloudflare),
 * on la passe telle quelle. Sinon, on assume une URL relative au domaine.
 */
export function clubLogoUrl(logo: string | null | undefined): string | null {
  if (!logo) return null;
  if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
  if (logo.startsWith('data:')) return logo;
  return publicAbsoluteUrl(logo);
}
