// Extrait de DraftCalendarAdmin.tsx (2200 lignes) — un fichier, une responsabilite.

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Nombre de journées nécessaires en round-robin pour N équipes.
// N pair : N-1 journées en simple, doublé en aller-retour.
// N impair : N journées (une équipe au repos chaque journée), doublé en aller-retour.
export function matchdaysForTeamCount(n: number, doubleRound: boolean): number {
  if (n < 2) return 0;
  const base = n % 2 === 0 ? n - 1 : n;
  return doubleRound ? base * 2 : base;
}

export function computePreviewDates(
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrence: number,
  startDate: string,
  endDate: string,
): string[] {
  if (!startDate || !endDate) return [];
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return [];

  const cursor = new Date(start);
  const daysUntil = (targetDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil);

  const dates: string[] = [];
  while (cursor <= end) {
    dates.push(cursor.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
    cursor.setDate(cursor.getDate() + 7 * recurrence);
  }
  return dates;
}

// ISO (YYYY-MM-DD) en heure locale navigateur — même convention que
// computePreviewDates (et cohérent avec la génération serveur en heure Réunion).
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Date de la N-ième journée à partir de startDate, en respectant le jour cible
// et la récurrence. Sert à DÉDUIRE la date de fin depuis un nombre de journées
// saisi par l'admin (au lieu de la saisir à la main).
export function nthMatchdayISO(
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  recurrence: number,
  startDate: string,
  count: number,
): string {
  if (!startDate || count < 1) return '';
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const cursor = new Date(startDate + 'T00:00:00');
  if (isNaN(cursor.getTime())) return '';
  const daysUntil = (targetDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil + 7 * recurrence * (count - 1));
  return toISODate(cursor);
}

// Première date au jour cible STRICTEMENT après `afterISO`. Sert à « enchaîner »
// une compétition juste après la dernière journée déjà planifiée.
export function nextTargetDayAfterISO(
  dayOfWeek: 'SATURDAY' | 'SUNDAY',
  afterISO: string,
): string {
  const targetDay = dayOfWeek === 'SATURDAY' ? 6 : 0;
  const cursor = new Date(afterISO + 'T00:00:00');
  if (isNaN(cursor.getTime())) return '';
  cursor.setDate(cursor.getDate() + 1);
  const daysUntil = (targetDay - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + daysUntil);
  return toISODate(cursor);
}
