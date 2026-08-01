// Répartition des affiches d'une compétition sur les créneaux RÉELS d'un
// calendrier provisoire. Fonction pure, sans I/O : testable isolément
// (`node --test lib/scheduling/distribute.test.ts`).
//
// Pourquoi ce module existe
// -------------------------
// `roundRobin.ts` produit les paires groupées par TOUR : avec 4 équipes, un
// tour ne contient que 2 affiches. Or une journée de salle en compte 3 ou 4
// selon ce que l'admin a configuré dans le calendrier. L'ancienne hypothèse
// « 1 journée = 1 tour » laissait donc des créneaux vides et, comme chaque
// journée retirait au sort indépendamment, produisait des doublons.
//
// Ici on fait l'inverse : on APLATIT toutes les affiches de la compétition,
// puis on les REDÉCOUPE selon le nombre de créneaux réellement disponibles,
// date par date. Rien n'est supposé du format : 3/jour, 4/jour, ou un nombre
// différent à chaque date, tout vient du calendrier.
//
// Contraintes respectées, par ordre de priorité :
//   1. Un créneau figé (match déjà converti, ou affiche épinglée par l'admin)
//      n'est jamais réécrit — et l'affiche qu'il porte est retirée du pool.
//   2. Répartition homogène du nombre de matchs par équipe à l'intérieur
//      d'une journée (avec 4 équipes et 3 créneaux, deux équipes jouent deux
//      fois : on alterne lesquelles d'une journée à l'autre).
//   3. Aller et retour d'une même affiche ne tombent pas le même jour.
//   4. Placement horaire délégué à `fairness.ts` (pas de back-to-back,
//      équilibre premier/dernier créneau sur la saison).

import type { Pair } from './roundRobin';
import { assignPairsToSlots } from './fairness';

/** Une date du calendrier et ses créneaux, dans l'ordre horaire. */
export type DaySpec = {
  /** ISO `YYYY-MM-DD`. Sert au tri chronologique et aux messages. */
  date: string;
  matchday: number;
  /** Identifiants des créneaux, dans l'ordre horaire. */
  slotIds: string[];
  /**
   * Affiches déjà figées, indexées comme `slotIds`. `null` = créneau libre.
   * Un créneau figé porte un match converti ou une affiche épinglée.
   */
  fixed: (Pair | null)[];
};

export type Assignment = {
  slotId: string;
  pair: Pair | null;
  /** true si l'affiche était déjà figée (non modifiée par ce tirage). */
  fixed: boolean;
};

export type DistributeResult = {
  days: { date: string; matchday: number; assignments: Assignment[] }[];
  /** Affiches qui n'ont pas trouvé de créneau — il manque des dates. */
  unplaced: Pair[];
  /** Nombre de créneaux restés vides — il y a trop de dates. */
  emptySlots: number;
  warnings: string[];
};

export type DistributeOptions = {
  /** Mélange déterministe du pool avant répartition. Même graine = même tirage. */
  seed?: number;
};

/** Clé non orientée : HCO-HCP et HCP-HCO donnent la même. */
function pairKey(p: Pair): string {
  return p.home < p.away ? `${p.home}|${p.away}` : `${p.away}|${p.home}`;
}

export function distributePairsOverDays(
  allPairs: Pair[],
  days: DaySpec[],
  options: DistributeOptions = {},
): DistributeResult {
  const warnings: string[] = [];

  // Pool des affiches à placer, éventuellement mélangé (c'est le « tirage au
  // sort » proprement dit — déterministe à graine égale, donc rejouable).
  const pool: Pair[] =
    options.seed != null ? seededShuffle(allPairs, options.seed) : [...allPairs];

  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));

  // --- 1. Les créneaux figés consomment leur affiche dans le pool ----------
  // Sinon on reprogrammerait un match déjà joué. On retire en priorité
  // l'orientation exacte ; à défaut le retour (même clé non orientée).
  for (const day of ordered) {
    for (const fx of day.fixed) {
      if (!fx) continue;
      let idx = pool.findIndex((p) => p.home === fx.home && p.away === fx.away);
      if (idx === -1) idx = pool.findIndex((p) => pairKey(p) === pairKey(fx));
      if (idx !== -1) pool.splice(idx, 1);
    }
  }

  // --- 2. Choix des affiches de chaque journée ----------------------------
  // Compteur saisonnier : combien de fois chaque équipe a déjà joué deux fois
  // dans la même journée. Sert à alterner qui « double » d'une date à l'autre.
  const doubleDays = new Map<string, number>();
  const bump = (id: string) => doubleDays.set(id, (doubleDays.get(id) ?? 0) + 1);

  const chosenByDay: Pair[][] = [];

  for (const day of ordered) {
    const freeCount = day.fixed.filter((f) => f === null).length;

    // Les équipes déjà engagées ce jour-là par les créneaux figés comptent
    // dans l'équilibre de la journée.
    const dayCount = new Map<string, number>();
    const inc = (id: string) => dayCount.set(id, (dayCount.get(id) ?? 0) + 1);
    const placedKeysToday = new Set<string>();
    for (const fx of day.fixed) {
      if (!fx) continue;
      inc(fx.home);
      inc(fx.away);
      placedKeysToday.add(pairKey(fx));
    }

    const chosen: Pair[] = [];
    for (let k = 0; k < freeCount && pool.length > 0; k++) {
      let bestIdx = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        // Critère principal : privilégier les équipes qui ont le moins joué
        // aujourd'hui, pour étaler la charge dans la journée.
        let score = (dayCount.get(p.home) ?? 0) + (dayCount.get(p.away) ?? 0);
        // Aller et retour le même jour : fortement découragé.
        if (placedKeysToday.has(pairKey(p))) score += 100;
        // À égalité, faire doubler en priorité celles qui ont le moins doublé
        // depuis le début de la saison.
        score += ((doubleDays.get(p.home) ?? 0) + (doubleDays.get(p.away) ?? 0)) * 0.01;

        if (score < bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      const [pick] = pool.splice(bestIdx, 1);
      chosen.push(pick);
      inc(pick.home);
      inc(pick.away);
      placedKeysToday.add(pairKey(pick));
    }

    for (const [id, c] of dayCount) if (c > 1) bump(id);
    chosenByDay.push(chosen);
  }

  // --- 3. Placement horaire à l'intérieur de chaque journée ---------------
  // Délégué à fairness.ts, qui connaît déjà les règles back-to-back et
  // l'équilibre premier/dernier créneau, et sait éviter les créneaux figés.
  const placed = assignPairsToSlots(
    chosenByDay,
    ordered.map((d) => d.slotIds.length),
    ordered.map((d) => d.fixed),
  );

  const resultDays = ordered.map((day, i) => {
    const slotsForDay = placed[i]?.slots ?? [];
    for (const w of placed[i]?.warnings ?? []) warnings.push(w);
    return {
      date: day.date,
      matchday: day.matchday,
      assignments: day.slotIds.map((slotId, s) => {
        const fx = day.fixed[s] ?? null;
        return {
          slotId,
          pair: fx ?? slotsForDay[s] ?? null,
          fixed: fx != null,
        };
      }),
    };
  });

  const emptySlots = resultDays.reduce(
    (n, d) => n + d.assignments.filter((a) => a.pair == null).length,
    0,
  );

  if (pool.length > 0) {
    warnings.push(
      `${pool.length} affiche${pool.length > 1 ? 's' : ''} sans créneau : ajoutez une journée ou augmentez le nombre de matchs par journée.`,
    );
  }
  if (emptySlots > 0) {
    warnings.push(
      `${emptySlots} créneau${emptySlots > 1 ? 'x' : ''} vide${emptySlots > 1 ? 's' : ''} : retirez une journée ou réduisez le nombre de matchs par journée.`,
    );
  }

  return { days: resultDays, unplaced: pool, emptySlots, warnings };
}

/**
 * Nombre d'affiches que produit une compétition. Sert au bandeau de
 * couverture, qui doit annoncer le compte AVANT tout tirage.
 */
export function expectedPairCount(teamCount: number, doubleRound: boolean): number {
  if (teamCount < 2) return 0;
  const single = (teamCount * (teamCount - 1)) / 2;
  return doubleRound ? single * 2 : single;
}

// PRNG mulberry32 — déterministe, suffisant pour un tirage non-cryptographique.
// Identique à celui de roundRobin.ts : même graine, même résultat, donc un
// tirage est reproductible et vérifiable.
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
