/**
 * Parcours du jeune hockeyeur : lecture d'une feuille de chronos collée, mise
 * en forme d'un chrono, regroupement par journée et catégorie.
 *
 * Fichier NEUTRE (aucun import Prisma) : consommé par le formulaire d'admin
 * (aperçu en direct), par la server action (qui re-valide côté serveur) et par
 * la section publique. Une seule lecture de la feuille, donc l'aperçu montre
 * exactement ce qui sera enregistré.
 */
import { sharedRanks } from './rank';

export type CourseLine = {
  athleteName: string;
  team: string | null;
  timeMs: number;
  approximate: boolean;
};

export type CourseSheetResult = {
  lines: CourseLine[];
  /** Une entrée par ligne illisible, avec son numéro (1-based) dans le texte. */
  errors: { line: number; text: string; reason: string }[];
};

// « environ » avant « env » : l'alternance s'arrête à la première qui matche.
const APPROX = /^(≈|~|environ|env\.?)\s*/i;

/**
 * Chrono lu tel qu'il s'écrit sur les feuilles : « 31,45 s », « 31.45 »,
 * « 50 s », « ≈ 38 s », « 1 min 09 », « 1 min 16,27 s », « 1:16.27 », « 1'09 ».
 * `null` si illisible — jamais un 0 silencieux.
 */
export function parseCourseTime(raw: string): { timeMs: number; approximate: boolean } | null {
  let s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const approximate = APPROX.test(s);
  s = s.replace(APPROX, '').replace(/,/g, '.').trim();

  // « 1 min 16.27 s », « 1min09 », « 1 mn 09 »
  let m = s.match(/^(\d+)\s*(?:min|mn|m)\s*(\d{1,2}(?:\.\d{1,3})?)?\s*(?:s|sec)?$/);
  // « 1:16.27 », « 1'09 », « 1'09'' »
  if (!m) m = s.match(/^(\d+)\s*[:']\s*(\d{1,2}(?:\.\d{1,3})?)\s*(?:''|"|s)?$/);
  if (m) {
    const seconds = m[2] ? Number(m[2]) : 0;
    if (seconds >= 60) return null;
    return { timeMs: Math.round((Number(m[1]) * 60 + seconds) * 1000), approximate };
  }

  // « 31.45 s », « 50 », « 50 sec »
  m = s.match(/^(\d+(?:\.\d{1,3})?)\s*(?:s|sec|secondes?)?$/);
  if (m) {
    const ms = Math.round(Number(m[1]) * 1000);
    return ms > 0 ? { timeMs: ms, approximate } : null;
  }
  return null;
}

/**
 * « 31,45 s », « 50 s », « 1 min 09 s », « 1 min 16,27 s », préfixé de « ≈ »
 * si le chrono est approximatif. Décimales affichées seulement si le chrono
 * en a (37,50 s reste 37,50 s ; 50 s ne devient pas 50,00 s).
 */
export function formatCourseTime(timeMs: number, approximate = false): string {
  const whole = timeMs % 1000 === 0;
  const totalSeconds = timeMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const rest = totalSeconds - minutes * 60;
  const sec = whole ? String(Math.round(rest)) : rest.toFixed(2).replace('.', ',');
  const text = minutes > 0
    ? `${minutes} min ${sec.padStart(whole ? 2 : 5, '0')} s`
    : `${sec} s`;
  return approximate ? `≈ ${text}` : text;
}

/**
 * Une ligne par jeune : `Nom ; Équipe ; Chrono` ou `Nom ; Chrono`. Séparateurs
 * acceptés : point-virgule, tabulation (copie d'un tableur) ou barre verticale.
 * Une colonne de rang en tête (« 1 ; Naël ; 31,45 ») est ignorée : le rang se
 * recalcule depuis le chrono, la feuille ne fait pas foi là-dessus.
 */
export function parseCourseSheet(text: string): CourseSheetResult {
  const lines: CourseLine[] = [];
  const errors: CourseSheetResult['errors'] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    let fields = line.split(/\s*[;\t|]\s*/).map((f) => f.trim()).filter(Boolean);
    if (fields.length >= 3 && /^\d{1,3}\.?$/.test(fields[0])) fields = fields.slice(1);

    const fail = (reason: string) => errors.push({ line: index + 1, text: line, reason });
    if (fields.length < 2) return fail('Attendu : Nom ; Chrono (ou Nom ; Équipe ; Chrono).');
    if (fields.length > 3) return fail('Trop de colonnes : Nom ; Équipe ; Chrono au plus.');

    const time = parseCourseTime(fields[fields.length - 1]);
    if (!time) return fail(`Chrono illisible : « ${fields[fields.length - 1]} ».`);

    const athleteName = fields[0].replace(/\s+/g, ' ');
    const key = athleteName.toLocaleLowerCase('fr');
    if (seen.has(key)) return fail(`${athleteName} figure deux fois dans la série.`);
    seen.add(key);

    lines.push({
      athleteName,
      team: fields.length === 3 ? fields[1].replace(/\s+/g, ' ') : null,
      ...time,
    });
  });

  return { lines, errors };
}

/** Inverse de `parseCourseSheet` : pré-remplit le formulaire pour corriger une série. */
export function courseSheetText(rows: readonly CourseLine[]): string {
  return sortByTime(rows)
    .map((r) => [r.athleteName, r.team, formatCourseTime(r.timeMs, r.approximate)]
      .filter(Boolean).join(' ; '))
    .join('\n');
}

export function sortByTime<T extends { timeMs: number; athleteName: string }>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (a, b) => a.timeMs - b.timeMs || a.athleteName.localeCompare(b.athleteName, 'fr'),
  );
}

/** Rangs ex aequo au même chrono (1, 2, 2, 4) — même règle que les buteurs. */
export function courseRanks(sortedRows: readonly { timeMs: number }[]): number[] {
  // sharedRanks compare des valeurs triées décroissantes ; seul l'égalité
  // compte, donc on lui passe les chronos négés.
  return sharedRanks(sortedRows.map((r) => -r.timeMs));
}

/** Tri « naturel » des catégories : U9 avant U11 avant U15, puis l'alphabet. */
export function compareCategories(a: string, b: string): number {
  const na = a.match(/^U(\d+)/i);
  const nb = b.match(/^U(\d+)/i);
  if (na && nb) return Number(na[1]) - Number(nb[1]);
  if (na) return -1;
  if (nb) return 1;
  return a.localeCompare(b, 'fr');
}

export type CourseSeries<T> = { category: string; rows: T[]; ranks: number[] };
export type CourseSession<G, T> = { gathering: G; series: CourseSeries<T>[] };

/**
 * Chronos → journées (de la plus récente à la plus ancienne) → séries par
 * catégorie, chaque série triée par chrono avec ses rangs.
 */
export function groupCourseSessions<
  T extends {
    category: string; timeMs: number; athleteName: string;
    gathering: { id: string; date: Date | string };
  },
>(rows: readonly T[]): CourseSession<T['gathering'], T>[] {
  const byGathering = new Map<string, { gathering: T['gathering']; byCat: Map<string, T[]> }>();
  for (const r of rows) {
    let entry = byGathering.get(r.gathering.id);
    if (!entry) {
      entry = { gathering: r.gathering, byCat: new Map() };
      byGathering.set(r.gathering.id, entry);
    }
    entry.byCat.set(r.category, [...(entry.byCat.get(r.category) ?? []), r]);
  }
  return [...byGathering.values()]
    .sort((a, b) => +new Date(b.gathering.date) - +new Date(a.gathering.date))
    .map(({ gathering, byCat }) => ({
      gathering,
      series: [...byCat.entries()]
        .sort(([a], [b]) => compareCategories(a, b))
        .map(([category, list]) => {
          const sorted = sortByTime(list);
          return { category, rows: sorted, ranks: courseRanks(sorted) };
        }),
    }));
}
