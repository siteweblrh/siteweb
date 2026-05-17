// Distance à vol d'oiseau (Haversine) entre deux paires lat/lon, en kilomètres.
//
// Source : https://en.wikipedia.org/wiki/Haversine_formula
// Précision : largement suffisante pour des distances inter-communes à
// l'échelle de La Réunion (< 80 km).

export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/** Trouve le slug de la commune la plus proche d'une paire lat/lon donnée.
 *  Utile pour le bouton "Me localiser" qui retourne la commune la plus
 *  proche de la géolocalisation navigateur. */
export function nearestCity(
  pos: LatLon,
  cities: Array<{ slug: string; lat: number; lon: number }>,
): { slug: string; distanceKm: number } | null {
  let best: { slug: string; distanceKm: number } | null = null;
  for (const c of cities) {
    const d = haversineKm(pos, { lat: c.lat, lon: c.lon });
    if (best === null || d < best.distanceKm) {
      best = { slug: c.slug, distanceKm: d };
    }
  }
  return best;
}
