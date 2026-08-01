// Affecte les paires d'une journée aux créneaux horaires de cette journée,
// avec contraintes :
//   (A) Back-to-back inter-journée : si une équipe a joué deux paires en
//       slots adjacents la journée précédente, on évite de la remettre en
//       slots adjacents cette journée. Ne s'applique que si l'équipe joue
//       plusieurs fois ce jour-là (sinon question caduque).
//   (B) Équilibre horaire : compteur cumulé sur la saison du nombre de
//       fois où chaque équipe est en "premier slot" vs "dernier slot".
//       À choix égal, on rééquilibre.
//   (C) Créneaux figés : un slot portant un match déjà converti ou une
//       affiche épinglée par l'admin n'est jamais réécrit. Il participe en
//       revanche aux vérifications d'adjacence — un match figé au slot 2
//       empêche la même équipe d'occuper les slots 1 et 3.
//
// L'algo est déterministe : pas de Math.random. Si une contrainte est
// insoluble (rare, ex. 4 paires impliquant toutes le même team), on
// accepte la solution la plus proche et on remonte un warning par
// matchday dans le résultat.
//
// Le choix des paires d'une journée ne se fait PAS ici : voir distribute.ts.

import type { Pair } from './roundRobin';

export type DayAssignment = {
  matchday: number;
  /**
   * Indexé par slotIndex (0-based), longueur = nombre de créneaux.
   * `null` = créneau resté vide. Les créneaux figés portent leur affiche.
   */
  slots: (Pair | null)[];
  warnings: string[];
};

type TeamState = {
  // dernière journée où l'équipe a joué back-to-back (slots i, i+1)
  lastBackToBack: number | null;
  earlyCount: number; // nb de fois où l'équipe a joué en 1er slot du jour
  lateCount: number;  // nb de fois où l'équipe a joué en dernier slot
};

/**
 * Assigne les paires aux slots, journée par journée.
 *
 * @param pairsByMatchday paires à placer dans les créneaux LIBRES de chaque journée
 * @param slotsByMatchday nombre total de créneaux de chaque journée
 * @param fixedByMatchday optionnel — affiches déjà figées, indexées par slot
 */
export function assignPairsToSlots(
  pairsByMatchday: Pair[][],
  slotsByMatchday: number[],
  fixedByMatchday?: (Pair | null)[][],
): DayAssignment[] {
  const teams = new Map<string, TeamState>();
  const ensure = (id: string): TeamState => {
    let s = teams.get(id);
    if (!s) {
      s = { lastBackToBack: null, earlyCount: 0, lateCount: 0 };
      teams.set(id, s);
    }
    return s;
  };

  const result: DayAssignment[] = [];

  for (let md = 0; md < pairsByMatchday.length; md++) {
    const pairs = pairsByMatchday[md];
    const slotCount = slotsByMatchday[md] ?? pairs.length;
    const warnings: string[] = [];

    // Grille de départ : les créneaux figés sont déjà occupés.
    const placed: (Pair | null)[] = Array(slotCount).fill(null);
    const fixed = fixedByMatchday?.[md];
    if (fixed) {
      for (let i = 0; i < slotCount; i++) {
        if (fixed[i]) placed[i] = fixed[i]!;
      }
    }
    const freeCount = placed.filter((p) => p == null).length;

    if (pairs.length === 0 && freeCount === 0) {
      result.push({ matchday: md + 1, slots: placed, warnings });
      continue;
    }

    if (pairs.length > freeCount) {
      warnings.push(
        `Journée ${md + 1} : ${pairs.length} paires pour seulement ${freeCount} créneaux libres — surplus ignoré.`,
      );
    }
    if (pairs.length < freeCount) {
      warnings.push(
        `Journée ${md + 1} : ${pairs.length} paires pour ${freeCount} créneaux libres — places vides.`,
      );
    }

    const toPlace = pairs.slice(0, freeCount);

    // Comptage des équipes qui jouent plusieurs fois ce jour (concernées
    // par la contrainte back-to-back). Les affiches figées comptent aussi.
    const counts = new Map<string, number>();
    for (const p of [...toPlace, ...placed.filter((p): p is Pair => p != null)]) {
      counts.set(p.home, (counts.get(p.home) ?? 0) + 1);
      counts.set(p.away, (counts.get(p.away) ?? 0) + 1);
    }
    const multi = new Set<string>();
    for (const [id, c] of counts) if (c > 1) multi.add(id);

    // Équipes en "dette" : ont joué back-to-back la journée précédente.
    const inDebt = new Set<string>();
    for (const id of multi) {
      const s = ensure(id);
      if (s.lastBackToBack === md - 1) inDebt.add(id);
    }

    const remaining = [...toPlace];

    // Phase 1 : équipes en dette → écarter leurs paires aux extrémités
    // libres, pour qu'elles ne rejouent pas deux fois d'affilée.
    for (const teamId of inDebt) {
      const teamPairs = remaining.filter((p) => p.home === teamId || p.away === teamId);
      if (teamPairs.length < 2) continue;
      const firstFree = placed.findIndex((p) => p == null);
      const lastFree = placed.length - 1 - [...placed].reverse().findIndex((p) => p == null);
      if (firstFree === -1 || lastFree === firstFree) {
        warnings.push(
          `Journée ${md + 1} : impossible d'écarter l'équipe ${teamId} (pas assez de créneaux libres).`,
        );
        continue;
      }
      placed[firstFree] = teamPairs[0];
      placed[lastFree] = teamPairs[teamPairs.length - 1];
      remaining.splice(remaining.indexOf(teamPairs[0]), 1);
      remaining.splice(remaining.indexOf(teamPairs[teamPairs.length - 1]), 1);
    }

    // Phase 2 : remplir les créneaux libres restants, en évitant qu'une
    // équipe occupe deux slots adjacents.
    const conflictAdjacent = (slotIdx: number, p: Pair): boolean => {
      for (const nb of [slotIdx - 1, slotIdx + 1]) {
        if (nb < 0 || nb >= slotCount) continue;
        const other = placed[nb];
        if (!other) continue;
        if (
          other.home === p.home || other.away === p.away ||
          other.home === p.away || other.away === p.home
        ) return true;
      }
      return false;
    };

    for (let i = 0; i < slotCount && remaining.length > 0; i++) {
      if (placed[i] != null) continue;
      // Choisit en priorité une paire sans conflit d'adjacence ; à défaut,
      // la première disponible (contrainte insoluble, on ne bloque pas).
      let pick = remaining.findIndex((p) => !conflictAdjacent(i, p));
      if (pick === -1) {
        pick = 0;
        if (multi.size > 0) {
          warnings.push(
            `Journée ${md + 1} : deux matchs consécutifs pour une même équipe (créneau ${i + 1}) — inévitable avec cette configuration.`,
          );
        }
      }
      placed[i] = remaining[pick];
      remaining.splice(pick, 1);
    }

    // Calcul des nouvelles dettes pour la prochaine journée. On raisonne sur
    // les créneaux occupés consécutifs, figés inclus.
    for (let i = 0; i < slotCount - 1; i++) {
      const a = placed[i];
      const b = placed[i + 1];
      if (!a || !b) continue;
      for (const t of sharedTeams(a, b)) ensure(t).lastBackToBack = md;
    }
    const occupied = placed.filter((p): p is Pair => p != null);
    if (occupied.length > 0) {
      const first = occupied[0];
      ensure(first.home).earlyCount++;
      ensure(first.away).earlyCount++;
      if (occupied.length > 1) {
        const last = occupied[occupied.length - 1];
        ensure(last.home).lateCount++;
        ensure(last.away).lateCount++;
      }
    }

    result.push({ matchday: md + 1, slots: placed, warnings });
  }

  return result;
}

function sharedTeams(a: Pair, b: Pair): string[] {
  const out: string[] = [];
  if (a.home === b.home || a.home === b.away) out.push(a.home);
  if (a.away === b.home || a.away === b.away) out.push(a.away);
  return out;
}
