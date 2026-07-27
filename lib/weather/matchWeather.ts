import { getCityLatLon } from '@/lib/reunionCityCoords';
import { toReunionDatetimeLocal } from '@/lib/utils/datetime-reunion';

/**
 * Météo prévue à l'heure du coup d'envoi d'un match.
 *
 * Remplace l'ancien bandeau `WeatherBadge` + `/api/weather`, retirés en
 * juillet 2026. L'ancien dispositif tournait dans le Header — donc sur TOUTES
 * les pages — et faisait deux requêtes Prisma non cachées par page vue pour
 * afficher, la plupart du temps, la température de communes sans rapport avec
 * ce que le visiteur consultait. C'est ce qui a épuisé le quota compute Neon.
 *
 * Ici, l'information est rendue là où la question se pose réellement : la page
 * d'un match à venir. Deux propriétés qui comptent :
 *
 *   1. **Aucune requête base.** La commune provient du match déjà chargé par
 *      `getMatchPublic`. Ce module ne connaît pas Prisma.
 *   2. **Aucun JavaScript client.** Appelé depuis le Server Component, le
 *      résultat part en prop. Pas de fetch navigateur, pas de setInterval.
 *
 * Le seul appel réseau est Open-Meteo (API publique gratuite, sans clé), mis
 * en cache 30 min par le Data Cache de Next et partagé par tous les visiteurs
 * du même match.
 */

const BASE = 'https://api.open-meteo.com/v1/forecast';

// Open-Meteo ne prévoit que ~16 jours. Au-delà, on n'affiche rien plutôt que
// d'inventer une valeur.
const FORECAST_HORIZON_DAYS = 14;

export type MatchWeather = {
  city: string;
  temperature: number;
  code: number;
  label: string;
  precipitationMm: number | null;
  windKmh: number | null;
};

// Mapping WMO Weather Code → libellé FR. Codes : https://open-meteo.com/en/docs
function codeToLabel(code: number): string {
  if (code === 0) return 'Soleil';
  if (code === 1) return 'Peu nuageux';
  if (code === 2) return 'Éclaircies';
  if (code === 3) return 'Nuageux';
  if (code === 45 || code === 48) return 'Brume';
  if (code >= 51 && code <= 57) return 'Bruine';
  if (code >= 61 && code <= 67) return 'Pluie';
  if (code >= 71 && code <= 77) return 'Neige';
  if (code >= 80 && code <= 82) return 'Averses';
  if (code === 95) return 'Orage';
  if (code === 96 || code === 99) return 'Orage de grêle';
  return '—';
}

export async function getMatchWeather(params: {
  city: string | null | undefined;
  kickoffAt: Date | string;
  mode: 'GAZON' | 'SALLE';
  status: string;
}): Promise<MatchWeather | null> {
  const { city, kickoffAt, mode, status } = params;

  // Le hockey en salle se joue à l'intérieur : la météo n'apporte rien.
  if (mode !== 'GAZON') return null;

  // Match déjà joué, reporté ou annulé : la prévision n'a plus d'objet.
  if (status !== 'SCHEDULED') return null;

  const kickoff = new Date(kickoffAt);
  if (Number.isNaN(kickoff.getTime())) return null;

  const msAhead = kickoff.getTime() - Date.now();
  if (msAhead < 0) return null;
  if (msAhead > FORECAST_HORIZON_DAYS * 24 * 60 * 60 * 1000) return null;

  const ll = getCityLatLon(city);
  if (!ll) return null;

  // Open-Meteo attend une heure locale pleine. `toReunionDatetimeLocal` rend
  // "YYYY-MM-DDTHH:mm" en UTC+4 — on arrondit à l'heure du coup d'envoi.
  const hour = toReunionDatetimeLocal(kickoff).slice(0, 13) + ':00';

  const url =
    `${BASE}?latitude=${ll.lat}&longitude=${ll.lon}` +
    `&hourly=temperature_2m,weather_code,precipitation,wind_speed_10m` +
    `&timezone=Indian%2FReunion&start_hour=${hour}&end_hour=${hour}`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;

    const data = await res.json();
    const h = data?.hourly;
    const temperature = h?.temperature_2m?.[0];
    const code = h?.weather_code?.[0];

    if (typeof temperature !== 'number' || typeof code !== 'number') return null;

    const precipitation = h?.precipitation?.[0];
    const wind = h?.wind_speed_10m?.[0];

    return {
      city: city ?? '',
      temperature: Math.round(temperature),
      code,
      label: codeToLabel(code),
      precipitationMm: typeof precipitation === 'number' ? precipitation : null,
      windKmh: typeof wind === 'number' ? Math.round(wind) : null,
    };
  } catch {
    // Open-Meteo indisponible : la page du match s'affiche sans météo.
    return null;
  }
}
