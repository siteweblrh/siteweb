/**
 * Jours fériés La Réunion (France + 20 décembre).
 * Client-safe — pas d'import serveur.
 */

// Algorithme de Meeus pour Pâques grégorien
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function utcKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type Holiday = { date: Date; key: string; name: string };

/** Tous les jours fériés pour une année civile. */
export function holidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);

  const fixed: [number, number, string][] = [
    [0, 1, 'Jour de l\'An'],
    [4, 1, 'Fête du Travail'],
    [4, 8, 'Victoire 1945'],
    [6, 14, 'Fête Nationale'],
    [7, 15, 'Assomption'],
    [10, 1, 'Toussaint'],
    [10, 11, 'Armistice 1918'],
    [11, 20, 'Abolition de l\'esclavage'],
    [11, 25, 'Noël'],
  ];

  const list: Holiday[] = fixed.map(([m, d, name]) => {
    const date = new Date(Date.UTC(year, m, d));
    return { date, key: utcKey(date), name };
  });

  const mobile: [number, string][] = [
    [1, 'Lundi de Pâques'],
    [39, 'Ascension'],
    [50, 'Lundi de Pentecôte'],
  ];

  for (const [offset, name] of mobile) {
    const date = addDays(easter, offset);
    list.push({ date, key: utcKey(date), name });
  }

  list.sort((a, b) => a.date.getTime() - b.date.getTime());
  return list;
}

/** Jours fériés couvrant une plage de dates (typiquement une saison sportive). */
export function holidaysForRange(startDate: Date, endDate: Date): Holiday[] {
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  const all: Holiday[] = [];
  for (let y = startYear; y <= endYear; y++) {
    all.push(...holidaysForYear(y));
  }
  return all.filter((h) => h.date >= startDate && h.date <= endDate);
}

/** Set de clés ISO "YYYY-MM-DD" pour lookup rapide. */
export function holidayKeySet(startDate: Date, endDate: Date): Set<string> {
  return new Set(holidaysForRange(startDate, endDate).map((h) => h.key));
}

/** Map clé ISO → nom du jour férié pour lookup rapide. */
export function holidayMap(startDate: Date, endDate: Date): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of holidaysForRange(startDate, endDate)) {
    m.set(h.key, h.name);
  }
  return m;
}

/**
 * Saison sportive courante à planifier.
 * Convention : si mois >= août → {year}-{year+1}, sinon → {year-1}-{year}.
 * Pour la planification (formulaire calendrier), on propose la saison suivante
 * si on est en deuxième moitié de saison (mois >= mai).
 */
export function currentSeason(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  if (m >= 7) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

export function nextSeason(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 7) return `${y + 1}-${y + 2}`;
  return `${y}-${y + 1}`;
}
