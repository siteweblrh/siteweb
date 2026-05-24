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
 * **Rasterisé en PNG** via sharp avant d'être servi à Satori. Le SVG source
 * a des paths complexes que Satori peut mal parser → safer de pré-rendre.
 *
 * Note : le dossier s'appelle `silouhettes` (typo orig.) dans le repo.
 */
const SILHOUETTES = [
  '/social/silouhettes/en-course-1.svg',
  '/social/silouhettes/en-course-2.svg',
  '/social/silouhettes/frappe.svg',
  '/social/silouhettes/gardien.svg',
] as const;

export function pickSilhouettePath(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % SILHOUETTES.length;
  return SILHOUETTES[idx];
}

/**
 * Aspect ratio du badge LRH officiel. Source viewBox `0 0 16667 16667` = carré
 * 1:1. Le badge contient le rect navy, l'icône rouge+jaune en haut, les
 * lettres L/R/H (avec le contour Réunion intégré dans le R), et le texte
 * "LIGUE RÉUNIONNAISE DE HOCKEY" intégré dans la composition.
 */
export const LRH_BADGE_ASPECT = 1; // carré 1:1

/**
 * Pas de transformation : le badge officiel est utilisé tel quel (avec son
 * texte du bas et le contour Réunion dans la lettre R, partie intégrante de
 * l'identité visuelle LRH).
 *
 * Fonction conservée comme point d'extension si on veut un jour faire une
 * variante (white-on-transparent par ex.). Pour l'instant identity.
 */
export function cropLrhBadgeSvg(svg: string): string {
  return svg;
}

/**
 * Logo d'un club / sponsor pour Satori — version SYNCHRONE.
 *
 * **Crucial** : Satori ne décode QUE PNG, JPEG, SVG. Pas d'AVIF ni WebP.
 * Ce helper se contente de réécrire l'URL Cloudinary pour forcer `f_png`.
 * Pour les autres CDN (Cloudflare Images notamment), il faut passer par
 * `fetchImageAsDataUri` (async, côté serveur) qui contrôle le Accept
 * header explicitement.
 */
export function clubLogoUrl(logo: string | null | undefined): string | null {
  if (!logo) return null;
  if (logo.startsWith('data:')) return logo;
  if (logo.startsWith('http://') || logo.startsWith('https://')) {
    return forceSatoriCompatibleFormat(logo);
  }
  return forceSatoriCompatibleFormat(publicAbsoluteUrl(logo));
}

function forceSatoriCompatibleFormat(url: string): string {
  // Cloudinary : injecter `f_png` pour forcer PNG (sinon f_auto servirait AVIF).
  if (url.includes('res.cloudinary.com')) {
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1) return url;
    const after = url.slice(idx + marker.length);
    // Si une transform existe déjà, on remplace f_auto par f_png OU on
    // ajoute f_png si pas de f_*.
    const firstSlash = after.indexOf('/');
    const firstSegment = firstSlash === -1 ? '' : after.slice(0, firstSlash);
    const rest = firstSlash === -1 ? after : after.slice(firstSlash + 1);
    const hasTransforms = /^[a-z]_[^/]+/.test(firstSegment);
    if (hasTransforms) {
      const parts = firstSegment.split(',');
      const withoutFormat = parts.filter((p) => !p.startsWith('f_'));
      withoutFormat.unshift('f_png');
      return url.slice(0, idx + marker.length) + withoutFormat.join(',') + '/' + rest;
    }
    return url.slice(0, idx + marker.length) + 'f_png/' + after;
  }
  return url;
}

/**
 * Fetch côté server une image distante et la retourne en data URI base64.
 *
 * **Crucial pour Cloudflare Images / autres CDN** : ces CDN servent
 * AVIF/WebP par défaut selon le `Accept` du client. On force ici un
 * `Accept: image/png, image/jpeg, image/*;q=0.8` pour obtenir un format
 * que Satori sait décoder.
 *
 * Si l'image est déjà une data URI, on la renvoie telle quelle. Si le
 * fetch échoue (404, 500, timeout…), on retourne null et le caller
 * gère le fallback (pastille couleur club, sponsor invisible…).
 *
 * Le résultat est caché en module-level (idempotent par cold start),
 * comme les fonts. Évite de re-fetch les mêmes logos à chaque affiche.
 */
const REMOTE_IMAGE_CACHE = new Map<string, string>();

export async function fetchImageAsDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) {
    console.log('[social-poster] fetchImageAsDataUri: input is null (Club.logo or Sponsor.logo non défini en DB)');
    return null;
  }
  if (url.startsWith('data:')) return url;

  // Pré-traitement : pour Cloudinary, force `f_png` à l'URL pour éviter
  // que `f_auto` serve un AVIF/WebP que Satori refuse. forceSatoriCompatibleFormat
  // est défini plus haut dans ce fichier — on l'appelle ici aussi pour les
  // URLs qu'on fetch côté serveur.
  const safeUrl = url.includes('res.cloudinary.com')
    ? url.replace(/\/upload\/(?!.*f_png)([^/]*?)f_auto/, '/upload/$1f_png')
    : url;

  const cached = REMOTE_IMAGE_CACHE.get(safeUrl);
  if (cached) return cached;

  console.log(`[social-poster] fetching: ${safeUrl.slice(0, 120)}${safeUrl.length > 120 ? '…' : ''}`);
  try {
    const res = await fetch(safeUrl, {
      headers: {
        Accept: 'image/png, image/jpeg, image/svg+xml, image/*;q=0.5',
        'User-Agent': 'Mozilla/5.0 (LRH-SocialPoster)',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[social-poster] fetch FAILED status=${res.status} url=${safeUrl}`);
      return null;
    }
    const contentType = res.headers.get('content-type') ?? 'image/png';
    console.log(`[social-poster] fetch OK content-type=${contentType} url=${safeUrl.slice(0, 80)}…`);
    if (contentType.includes('avif') || contentType.includes('webp')) {
      console.warn(
        `[social-poster] CDN returned ${contentType} despite Accept header — refusing (Satori can't decode)`,
      );
      return null;
    }
    const buf = await res.arrayBuffer();
    const uri = `data:${contentType};base64,${Buffer.from(buf).toString('base64')}`;
    REMOTE_IMAGE_CACHE.set(safeUrl, uri);
    return uri;
  } catch (err) {
    console.warn(
      `[social-poster] fetch ERROR url=${safeUrl} error=${err instanceof Error ? err.message : err}`,
    );
    return null;
  }
}

/**
 * Image de fond saisonnière (illustration unique réutilisée par toutes
 * les affiches de la saison). Si présente dans `public/social/season-background.{png,jpg,jpeg}`
 * on l'utilise à la place de la texture par mode. Sinon, fallback texture.
 *
 * Permet à l'admin de poser UN visuel hero (joueur en action, ambiance
 * stade) qui devient la signature visuelle de la saison sans modifier
 * le code.
 */
export function seasonBackgroundDataUri(): string | null {
  const candidates = [
    { path: '/social/season-background.png', mime: 'image/png' },
    { path: '/social/season-background.jpg', mime: 'image/jpeg' },
    { path: '/social/season-background.jpeg', mime: 'image/jpeg' },
  ];
  for (const c of candidates) {
    const absPath = path.join(process.cwd(), 'public', c.path.replace(/^\/+/, ''));
    if (fs.existsSync(absPath)) {
      return publicFileAsDataUri(c.path, c.mime);
    }
  }
  return null;
}
