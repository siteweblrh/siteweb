// Mapping ville de La Réunion → position (x, y) sur le SVG
// `public/assets/La-Reunion-974-carte.svg` (viewBox 0 0 14413 13405).
//
// Les coordonnées sont en POURCENTAGES du viewBox (0–100), origine top-left.
// Elles dérivent de la **latitude/longitude réelle** de chaque commune, projetée
// sur la bounding-box mesurée du contour SVG.
//
// Calibration (cf. script de calcul dans l'historique du repo) :
//   - bbox de l'île dans le viewBox : [10.446%, 92.870%] en X ; [9.282%, 88.607%] en Y
//   - bornes géographiques (pointes extrêmes IGN) :
//     · Pointe des Galets (W) : 55.2186°E
//     · Pointe des Cascades (E) : 55.8367°E
//     · Pointe des Jardins (N) : 20.8708°S
//     · Pointe de la Table (S) : 21.3892°S
//
// Lookup `normalizeCity(city)` : tolère accents, casse et tirets
// (ex. "Saint-Paul" / "saint paul" / "SAINT PAUL" matchent tous "saint-paul").

export type MapCoord = { x: number; y: number };

// Bbox de l'île dans le viewBox SVG (en % du viewBox)
const ISL = { left: 10.446, right: 92.87, top: 9.282, bottom: 88.607 } as const;
// Bornes géographiques de l'île (degrés décimaux, sud négatif)
const GEO = { lonW: 55.2186, lonE: 55.8367, latN: -20.8708, latS: -21.3892 } as const;

/**
 * Convertit une coordonnée géographique (lat, lon en degrés) en position
 * (x, y) sur le SVG, en pourcentages du viewBox. Linéaire — la zone est
 * suffisamment petite pour que la projection équirectangulaire locale soit
 * indistinguable d'une Mercator à l'échelle où on travaille.
 */
export function ll2xy(lat: number, lon: number): MapCoord {
  const x = ISL.left + ((lon - GEO.lonW) / (GEO.lonE - GEO.lonW)) * (ISL.right - ISL.left);
  const y = ISL.top + ((GEO.latN - lat) / (GEO.latN - GEO.latS)) * (ISL.bottom - ISL.top);
  return { x: +x.toFixed(2), y: +y.toFixed(2) };
}

/**
 * Coordonnées GPS officielles (centre-ville) des 24 communes de La Réunion +
 * Sainte-Clotilde (sous-quartier de Saint-Denis) + Mafate (cirque, sans
 * commune dédiée). Source : INSEE / IGN.
 */
const CITY_GPS: Record<string, { lat: number; lon: number }> = {
  // Nord
  'saint-denis': { lat: -20.8789, lon: 55.4481 },
  'sainte-clotilde': { lat: -20.8992, lon: 55.4881 },
  'sainte-marie': { lat: -20.9, lon: 55.55 },
  'sainte-suzanne': { lat: -20.9067, lon: 55.6133 },

  // Est
  'saint-andre': { lat: -20.9619, lon: 55.6519 },
  'bras-panon': { lat: -21.0086, lon: 55.6789 },
  'saint-benoit': { lat: -21.0339, lon: 55.7129 },
  'la-plaine-des-palmistes': { lat: -21.1322, lon: 55.6383 },
  'sainte-rose': { lat: -21.1278, lon: 55.7956 },

  // Sud-Est
  'saint-philippe': { lat: -21.359, lon: 55.7674 },

  // Sud
  'saint-joseph': { lat: -21.3742, lon: 55.6178 },
  'petite-ile': { lat: -21.3406, lon: 55.5717 },
  'saint-pierre': { lat: -21.3393, lon: 55.4781 },
  'le-tampon': { lat: -21.2767, lon: 55.5172 },
  'entre-deux': { lat: -21.235, lon: 55.4717 },
  'saint-louis': { lat: -21.2872, lon: 55.408 },

  // Sud-Ouest
  'les-avirons': { lat: -21.2386, lon: 55.3389 },
  'etang-sale': { lat: -21.2603, lon: 55.3625 },

  // Ouest
  'saint-leu': { lat: -21.17, lon: 55.2917 },
  'trois-bassins': { lat: -21.0978, lon: 55.2942 },
  'saint-paul': { lat: -21.0096, lon: 55.2706 },

  // Nord-Ouest
  'la-possession': { lat: -20.9239, lon: 55.3375 },
  'le-port': { lat: -20.9389, lon: 55.2917 },

  // Centre / cirques
  'cilaos': { lat: -21.1336, lon: 55.4717 },
  'salazie': { lat: -21.0264, lon: 55.5292 },
  'mafate': { lat: -21.05, lon: 55.4256 },
};

// Précompute pour éviter de recalculer à chaque lookup.
const COORDS: Record<string, MapCoord> = Object.fromEntries(
  Object.entries(CITY_GPS).map(([slug, ll]) => [slug, ll2xy(ll.lat, ll.lon)])
);

// Aliases (variations courantes pour matcher les saisies admin)
const ALIASES: Record<string, string> = {
  'port': 'le-port',
  'possession': 'la-possession',
  'plaine-des-palmistes': 'la-plaine-des-palmistes',
  'tampon': 'le-tampon',
  'l-etang-sale': 'etang-sale',
  'les-trois-bassins': 'trois-bassins',
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCityCoords(city: string | null | undefined): MapCoord | null {
  if (!city) return null;
  const key = normalizeCity(city);
  return COORDS[key] ?? COORDS[ALIASES[key] ?? ''] ?? null;
}

/** Récupère les lat/lon GPS réelles d'une commune (≠ getCityCoords qui retourne
 *  les coords SVG). Utile pour calculs de distance haversine. */
export function getCityLatLon(
  city: string | null | undefined,
): { lat: number; lon: number } | null {
  if (!city) return null;
  const key = normalizeCity(city);
  const resolved = key in CITY_GPS ? key : ALIASES[key] ?? '';
  return CITY_GPS[resolved] ?? null;
}

export const KNOWN_CITIES = Object.keys(COORDS);

/** Libellés humains des communes (slug → "Nom Affichable"). Utile pour les
 *  selects et l'autocomplete. */
export const CITY_LABELS_BY_SLUG: Record<string, string> = {
  'saint-denis': 'Saint-Denis',
  'sainte-clotilde': 'Sainte-Clotilde',
  'sainte-marie': 'Sainte-Marie',
  'sainte-suzanne': 'Sainte-Suzanne',
  'saint-andre': 'Saint-André',
  'bras-panon': 'Bras-Panon',
  'saint-benoit': 'Saint-Benoît',
  'la-plaine-des-palmistes': 'La Plaine-des-Palmistes',
  'sainte-rose': 'Sainte-Rose',
  'saint-philippe': 'Saint-Philippe',
  'saint-joseph': 'Saint-Joseph',
  'petite-ile': 'Petite-Île',
  'saint-pierre': 'Saint-Pierre',
  'le-tampon': 'Le Tampon',
  'entre-deux': 'Entre-Deux',
  'saint-louis': 'Saint-Louis',
  'les-avirons': 'Les Avirons',
  'etang-sale': "L'Étang-Salé",
  'saint-leu': 'Saint-Leu',
  'trois-bassins': 'Trois-Bassins',
  'saint-paul': 'Saint-Paul',
  'la-possession': 'La Possession',
  'le-port': 'Le Port',
  'cilaos': 'Cilaos',
  'salazie': 'Salazie',
  'mafate': 'Mafate',
};

/** Liste { slug, label, lat, lon } pour l'autocomplete + géoloc. Limité aux
 *  communes (exclut Sainte-Clotilde quartier de Saint-Denis et Mafate cirque
 *  pour ne pas brouiller le choix utilisateur). */
export const CITIES_DIRECTORY = Object.entries(CITY_GPS)
  .filter(([slug]) => slug !== 'sainte-clotilde' && slug !== 'mafate')
  .map(([slug, ll]) => ({
    slug,
    label: CITY_LABELS_BY_SLUG[slug] ?? slug,
    lat: ll.lat,
    lon: ll.lon,
  }))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

/**
 * Labels à afficher SUR la carte (sous-ensemble des 24 communes — les
 * principales, pour ne pas surcharger). Le slug pointe vers `COORDS`.
 * `nudge` permet de décaler légèrement un label pour éviter qu'il chevauche
 * un autre, sans toucher à la coordonnée géographique du marker club.
 */
export type CityLabel = {
  slug: keyof typeof CITY_GPS | string;
  label: string;
  nudge?: { x?: number; y?: number };
};

export const MAJOR_CITY_LABELS: CityLabel[] = [
  // Nord
  { slug: 'saint-denis', label: 'Saint-Denis' },
  { slug: 'sainte-marie', label: 'Sainte-Marie' },
  { slug: 'sainte-suzanne', label: 'Sainte-Suzanne', nudge: { y: 2.2 } },
  // Est
  { slug: 'saint-andre', label: 'Saint-André' },
  { slug: 'saint-benoit', label: 'Saint-Benoît' },
  { slug: 'sainte-rose', label: 'Sainte-Rose' },
  // Sud-Est
  { slug: 'saint-philippe', label: 'Saint-Philippe' },
  // Sud
  { slug: 'saint-joseph', label: 'Saint-Joseph' },
  { slug: 'saint-pierre', label: 'Saint-Pierre' },
  { slug: 'le-tampon', label: 'Le Tampon' },
  { slug: 'saint-louis', label: 'Saint-Louis' },
  // Ouest
  { slug: 'etang-sale', label: 'L’Étang-Salé', nudge: { x: -3 } },
  { slug: 'saint-leu', label: 'Saint-Leu' },
  { slug: 'saint-paul', label: 'Saint-Paul' },
  // Nord-Ouest (compacts — décaler pour éviter chevauchement)
  { slug: 'la-possession', label: 'La Possession', nudge: { x: 4 } },
  { slug: 'le-port', label: 'Le Port', nudge: { x: -3.5 } },
  // Cirques (intérieur)
  { slug: 'cilaos', label: 'Cilaos' },
  { slug: 'salazie', label: 'Salazie' },
];

/** Résout un label vers ses coordonnées finales (avec nudge appliqué). */
export function getLabelCoord(l: CityLabel): MapCoord | null {
  const base = COORDS[l.slug];
  if (!base) return null;
  return {
    x: base.x + (l.nudge?.x ?? 0),
    y: base.y + (l.nudge?.y ?? 0),
  };
}
