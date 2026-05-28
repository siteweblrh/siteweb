// Générateur de round-robin pur (sans I/O). Utilisé côté client (preview
// tirage) et côté serveur (création de matchs / plan de conversion).
//
// Algorithme : "circle method" classique. Si nombre d'équipes impair, on
// ajoute un BYE virtuel ; la paire impliquant BYE est filtrée du résultat.
// L'inversion home/away à chaque tour rééquilibre les rôles dom/ext.

export type Pair = { home: string; away: string };

export type RoundRobinOptions = {
  doubleRound?: boolean;
  shuffleSeed?: number; // si fourni, mélange déterministe pour reproductibilité
};

/**
 * Génère les paires d'un round-robin. Retourne un tableau indexé par
 * journée (0-based), chaque journée contenant N/2 paires (ou (N-1)/2 si
 * N impair, à cause du BYE).
 */
export function generateRoundRobinPairs(
  teamIds: string[],
  options: RoundRobinOptions = {},
): Pair[][] {
  if (teamIds.length < 2) return [];

  let teams = [...teamIds];
  if (options.shuffleSeed != null) {
    teams = seededShuffle(teams, options.shuffleSeed);
  }

  const hasBye = teams.length % 2 === 1;
  const playList: (string | null)[] = hasBye ? [...teams, null] : [...teams];
  const n = playList.length;
  const rounds = n - 1;

  const schedule: Pair[][] = [];
  let rotating = [...playList];
  for (let r = 0; r < rounds; r++) {
    const journee: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      let home = rotating[i];
      let away = rotating[n - 1 - i];
      if (r % 2 === 1) {
        const tmp = home;
        home = away;
        away = tmp;
      }
      if (home != null && away != null) {
        journee.push({ home, away });
      }
    }
    schedule.push(journee);
    rotating = [rotating[0], rotating[n - 1], ...rotating.slice(1, n - 1)];
  }

  if (options.doubleRound) {
    const returnRounds: Pair[][] = schedule.map((j) =>
      j.map(({ home, away }) => ({ home: away, away: home })),
    );
    schedule.push(...returnRounds);
  }

  return schedule;
}

// PRNG mulberry32 — déterministe, suffisant pour un shuffle non-crypto.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
