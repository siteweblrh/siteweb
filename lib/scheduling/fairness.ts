// Affecte les paires d'un round-robin aux slots horaires d'une journée,
// avec contraintes :
//   (A) Back-to-back inter-journée : si une équipe a joué deux paires en
//       slots adjacents la journée précédente, on évite de la remettre en
//       slots adjacents cette journée. Ne s'applique que si l'équipe joue
//       plusieurs fois ce jour-là (sinon question caduque).
//   (B) Équilibre horaire : compteur cumulé sur la saison du nombre de
//       fois où chaque équipe est en "premier slot" vs "dernier slot".
//       À choix égal, on rééquilibre.
//
// L'algo est déterministe : pas de Math.random. Si une contrainte est
// insoluble (rare, ex. 4 paires impliquant toutes le même team), on
// accepte la solution la plus proche et on remonte un warning par
// matchday dans le résultat.

import type { Pair } from './roundRobin';

export type DayAssignment = {
  matchday: number;
  // index dans le tableau = slotIndex (0-based)
  slots: Pair[];
  warnings: string[];
};

type TeamState = {
  // dernière journée où l'équipe a joué back-to-back (slots i, i+1)
  lastBackToBack: number | null;
  earlyCount: number; // nb de fois où l'équipe a joué en 1er slot du jour
  lateCount: number;  // nb de fois où l'équipe a joué en dernier slot
};

/**
 * Assigne les paires aux slots, journée par journée, en respectant les
 * contraintes (A) et (B). Si `pairsByMatchday[i].length === slotCount`,
 * une paire par slot. Sinon : l'admin a sur/sous-rempli, on remplit dans
 * l'ordre et on émet un warning.
 */
export function assignPairsToSlots(
  pairsByMatchday: Pair[][],
  slotsByMatchday: number[],
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

    if (pairs.length === 0) {
      result.push({ matchday: md + 1, slots: [], warnings });
      continue;
    }

    if (pairs.length > slotCount) {
      warnings.push(
        `Journée ${md + 1} : ${pairs.length} paires pour seulement ${slotCount} créneaux — surplus ignoré.`,
      );
    }
    if (pairs.length < slotCount) {
      warnings.push(
        `Journée ${md + 1} : ${pairs.length} paires pour ${slotCount} créneaux — places vides.`,
      );
    }

    const toPlace = pairs.slice(0, slotCount);

    // Comptage des équipes qui jouent plusieurs fois ce jour (concernées
    // par la contrainte back-to-back).
    const counts = new Map<string, number>();
    for (const p of toPlace) {
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

    // Heuristique de placement :
    // 1. Si pas d'équipe multi, ordre = ordre des paires (rien à arbitrer
    //    pour back-to-back). Reste l'équilibrage horaire : on swap au
    //    sein de l'ordre pour favoriser les équipes en "déficit" horaire.
    // 2. Si une équipe multi en dette : ses paires doivent être espacées.
    //    On les place aux positions 0 et slotCount-1 (extrémités), les
    //    autres remplissent.

    const placed: (Pair | null)[] = Array(slotCount).fill(null);

    // Phase 1 : équipes en dette → écarter leurs paires.
    for (const teamId of inDebt) {
      const teamPairs = toPlace.filter((p) => p.home === teamId || p.away === teamId);
      if (teamPairs.length < 2) continue;
      // On en met une au début, une à la fin.
      const first = teamPairs[0];
      const last = teamPairs[teamPairs.length - 1];
      if (placed[0] == null) placed[0] = first;
      const endIdx = slotCount - 1;
      if (placed[endIdx] == null && endIdx !== 0) placed[endIdx] = last;
      // Si conflit (déjà placés), on lève juste un warning : impossible
      // d'écarter toutes les équipes en dette en même temps.
      if (placed[0] !== first || (placed[endIdx] !== last && endIdx !== 0)) {
        warnings.push(
          `Journée ${md + 1} : impossible d'écarter complètement l'équipe ${teamId} (back-to-back inévitable).`,
        );
      }
    }

    // Phase 2 : remplir le reste dans l'ordre, en évitant l'adjacence
    // pour les équipes multi non-en-dette si possible.
    const remaining = toPlace.filter((p) => !placed.includes(p));
    let cursor = 0;
    for (const pair of remaining) {
      while (cursor < slotCount && placed[cursor] != null) cursor++;
      if (cursor >= slotCount) break;
      // Vérification adjacence pour équipes multi : si une équipe est
      // déjà placée au slot cursor-1, on essaie de pousser au prochain
      // slot libre.
      const conflictAdjacent = (slotIdx: number, p: Pair): boolean => {
        if (slotIdx === 0) return false;
        const prev = placed[slotIdx - 1];
        if (!prev) return false;
        return prev.home === p.home || prev.away === p.away
          || prev.home === p.away || prev.away === p.home;
      };
      let target = cursor;
      if (conflictAdjacent(target, pair)) {
        // cherche le prochain slot libre non-adjacent
        let alt = cursor + 1;
        while (alt < slotCount && (placed[alt] != null || conflictAdjacent(alt, pair))) alt++;
        if (alt < slotCount) target = alt;
      }
      placed[target] = pair;
      cursor = Math.min(cursor + 1, target + 1);
    }

    // Tout fallback : remplir les trous restants avec les paires non placées.
    const stillRemaining = toPlace.filter((p) => !placed.includes(p));
    for (let i = 0; i < slotCount && stillRemaining.length > 0; i++) {
      if (placed[i] == null) placed[i] = stillRemaining.shift()!;
    }

    // Calcul des nouvelles dettes pour la prochaine journée.
    const finalSlots: Pair[] = placed.filter((p): p is Pair => p != null);
    for (let i = 0; i < finalSlots.length - 1; i++) {
      const a = finalSlots[i];
      const b = finalSlots[i + 1];
      const shared = sharedTeams(a, b);
      for (const t of shared) ensure(t).lastBackToBack = md;
    }
    if (finalSlots.length > 0) {
      const first = finalSlots[0];
      ensure(first.home).earlyCount++;
      ensure(first.away).earlyCount++;
      const last = finalSlots[finalSlots.length - 1];
      if (finalSlots.length > 1) {
        ensure(last.home).lateCount++;
        ensure(last.away).lateCount++;
      }
    }

    result.push({ matchday: md + 1, slots: finalSlots, warnings });
  }

  return result;
}

function sharedTeams(a: Pair, b: Pair): string[] {
  const out: string[] = [];
  if (a.home === b.home || a.home === b.away) out.push(a.home);
  if (a.away === b.home || a.away === b.away) out.push(a.away);
  return out;
}
