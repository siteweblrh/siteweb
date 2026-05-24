/**
 * Loader Google Fonts pour `next/og` (Satori).
 *
 * Satori veut un `ArrayBuffer` de la police, pas une URL CSS. On résout
 * l'URL du fichier WOFF/WOFF2 via la CSS API Google Fonts puis on fetch
 * le binaire. Tout est caché en module-level Map pour ne refaire le
 * round-trip qu'une fois par cold start de la Lambda.
 *
 * Source de vérité pour les familles utilisées dans les affiches sociales :
 *   - **Anton** (800) : titres massifs condensés (style "VS", noms équipes en gros).
 *   - **Bebas Neue** (400) : kickers + metadata uppercase, sport-feel.
 *   - **Montserrat** (700, 800) : body, déjà chargée côté site.
 *
 * Choix de ces fonts validé : toutes gratuites, Open Font License, dispo
 * sur Google Fonts → pas de gestion de licence à faire.
 */

type FontWeight = 400 | 700 | 800;

const FONT_CACHE = new Map<string, ArrayBuffer>();

function cacheKey(family: string, weight: FontWeight) {
  return `${family}@${weight}`;
}

/**
 * Récupère une police Google Fonts en `ArrayBuffer`, prête pour Satori.
 *
 * Si `text` est fourni, Google sert un subset uniquement pour ces glyphes
 * (gain de poids significatif, mais l'affiche doit ne contenir QUE ces
 * caractères — sinon glyphes manquants → ".notdef"). On le laisse omis
 * par défaut car les noms de club / lieux sont dynamiques.
 */
export async function loadGoogleFont(
  family: string,
  weight: FontWeight = 400,
): Promise<ArrayBuffer> {
  const key = cacheKey(family, weight);
  const cached = FONT_CACHE.get(key);
  if (cached) return cached;

  const url = new URL('https://fonts.googleapis.com/css2');
  url.searchParams.set('family', `${family}:wght@${weight}`);

  const cssRes = await fetch(url.toString(), {
    // User-Agent moderne : Google renvoie un CSS qui pointe sur WOFF2.
    // Sans cet UA, on récupère du TTF lourd (3-5× plus gros).
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!cssRes.ok) {
    throw new Error(`Google Fonts CSS fetch failed for ${family} ${weight}: ${cssRes.status}`);
  }
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(woff2?|truetype|opentype)['"]?\)/);
  if (!match) {
    throw new Error(`No font URL parsed for ${family} ${weight}`);
  }
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error(`Font binary fetch failed for ${family} ${weight}: ${fontRes.status}`);
  }
  const buf = await fontRes.arrayBuffer();
  FONT_CACHE.set(key, buf);
  return buf;
}

/**
 * Charge en parallèle toutes les polices nécessaires aux affiches sociales
 * et retourne le tableau `fonts` au format attendu par `ImageResponse`.
 */
export async function loadPosterFonts() {
  const [anton, bebas, montserrat700, montserrat800] = await Promise.all([
    loadGoogleFont('Anton', 400),
    loadGoogleFont('Bebas Neue', 400),
    loadGoogleFont('Montserrat', 700),
    loadGoogleFont('Montserrat', 800),
  ]);
  return [
    { name: 'Anton', data: anton, weight: 800 as const, style: 'normal' as const },
    { name: 'Bebas Neue', data: bebas, weight: 400 as const, style: 'normal' as const },
    { name: 'Montserrat', data: montserrat700, weight: 700 as const, style: 'normal' as const },
    { name: 'Montserrat', data: montserrat800, weight: 800 as const, style: 'normal' as const },
  ];
}
