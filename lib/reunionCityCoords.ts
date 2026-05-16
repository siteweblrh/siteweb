// Mapping ville de La Réunion → position sur le SVG
// `public/assets/La-Reunion-974-carte.svg` (viewBox 0 0 14413 13405).
//
// Les coordonnées sont en POURCENTAGES du viewBox (0-100), origine top-left.
// Elles ont été calculées à partir des latitudes/longitudes réelles, en
// considérant la bounding box géographique de l'île :
//   - Lat : 20.86°S (Saint-Denis, nord) → 21.39°S (sud)
//   - Lon : 55.21°E (Pointe des Galets, ouest) → 55.84°E (est)
// avec ~5% de padding vertical dans le SVG (la viewBox est légèrement plus
// haute que la ratio naturelle 1.19 de l'île).
//
// Lookup `slugify(city)` pour matcher : on tolère accents, casse et tirets
// (ex. "Saint-Paul" / "saint paul" / "SAINT PAUL" matchent tous "saint-paul").

export type MapCoord = { x: number; y: number };

const COORDS: Record<string, MapCoord> = {
  // Nord
  'saint-denis': { x: 39, y: 9 },
  'sainte-clotilde': { x: 43, y: 10 },
  'sainte-marie': { x: 50, y: 11 },
  'sainte-suzanne': { x: 59, y: 13 },

  // Nord-Ouest
  'le-port': { x: 19, y: 16 },
  'port': { x: 19, y: 16 },
  'la-possession': { x: 23, y: 18 },
  'possession': { x: 23, y: 18 },

  // Est
  'saint-andre': { x: 66, y: 20 },
  'bras-panon': { x: 72, y: 27 },
  'saint-benoit': { x: 77, y: 33 },
  'la-plaine-des-palmistes': { x: 60, y: 45 },
  'plaine-des-palmistes': { x: 60, y: 45 },
  'sainte-rose': { x: 73, y: 49 },

  // Ouest
  'saint-paul': { x: 19, y: 26 },
  'trois-bassins': { x: 15, y: 50 },
  'les-trois-bassins': { x: 15, y: 50 },
  'saint-leu': { x: 17, y: 56 },

  // Sud-Ouest
  'les-avirons': { x: 22, y: 67 },
  'l-etang-sale': { x: 25, y: 71 },
  'etang-sale': { x: 25, y: 71 },
  'saint-louis': { x: 31, y: 80 },

  // Centre (Hauts / cirques)
  'cilaos': { x: 35, y: 56 },
  'salazie': { x: 49, y: 33 },
  'mafate': { x: 31, y: 34 },

  // Sud
  'le-tampon': { x: 43, y: 73 },
  'tampon': { x: 43, y: 73 },
  'entre-deux': { x: 33, y: 68 },
  'saint-pierre': { x: 39, y: 86 },
  'petite-ile': { x: 47, y: 87 },
  'saint-joseph': { x: 56, y: 90 },

  // Sud-Est
  'saint-philippe': { x: 65, y: 84 },
};

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanum → hyphen
    .replace(/^-+|-+$/g, ''); // trim hyphens
}

export function getCityCoords(city: string | null | undefined): MapCoord | null {
  if (!city) return null;
  const key = normalizeCity(city);
  return COORDS[key] ?? null;
}

export const KNOWN_CITIES = Object.keys(COORDS);
