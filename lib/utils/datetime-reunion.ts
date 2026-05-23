/**
 * Toutes les dates de matchs/saisies sont traitées en fuseau **Indian/Reunion**
 * (UTC+4, pas de DST). L'admin saisit en heure locale Réunion, l'affichage
 * public/admin restitue en heure locale Réunion, quelle que soit la TZ du
 * navigateur ou du serveur Vercel.
 *
 * Pourquoi : sans ces helpers, `new Date("2026-05-23T18:00")` parse selon
 * la TZ runtime (navigateur Paris en été → 16:00 UTC ; serveur Vercel UTC →
 * 18:00 UTC). En Réunion, ça affiche +2h ou +4h selon le cas. Ici on force.
 */

export const REUNION_TZ = 'Indian/Reunion';

/** Réunion = UTC+4 fixe (pas de daylight saving). */
const REUNION_OFFSET = '+04:00';

/**
 * Parse `"YYYY-MM-DDTHH:mm"` (sortie d'un input datetime-local) comme heure
 * locale Réunion et renvoie le Date UTC correspondant.
 *
 * Accepte aussi `"YYYY-MM-DDTHH:mm:ss"`.
 */
export function parseReunionDatetimeLocal(s: string): Date {
  // Si secondes absentes, on les ajoute pour avoir un ISO complet.
  const withSeconds = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  return new Date(`${withSeconds}${REUNION_OFFSET}`);
}

/**
 * Combine une date `YYYY-MM-DD` et une heure `HH:mm` saisies en local
 * Réunion, renvoie le Date UTC.
 */
export function parseReunionDateAndTime(date: string, time: string): Date {
  return parseReunionDatetimeLocal(`${date}T${time}`);
}

/**
 * Convertit un Date en string `"YYYY-MM-DDTHH:mm"` exprimée en heure locale
 * Réunion — format attendu par les inputs `type="datetime-local"`.
 */
export function toReunionDatetimeLocal(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REUNION_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // hour peut être "24" sur certains runtimes en fin de journée — normalise.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Clé "jour" stable en TZ Réunion (`YYYY-MM-DD`). Utile pour grouper les
 * matchs par jour sans biais TZ navigateur.
 */
export function reunionDayKey(d: Date | string): string {
  return toReunionDatetimeLocal(d).slice(0, 10);
}

/** `"14:30"` en heure locale Réunion. */
export function formatReunionTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString('fr-FR', {
    timeZone: REUNION_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Date courte FR (`"23/05/2026"`) en TZ Réunion. */
export function formatReunionDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR', { timeZone: REUNION_TZ });
}
