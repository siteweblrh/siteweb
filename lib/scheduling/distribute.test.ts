// Tests de la répartition des affiches sur les créneaux réels du calendrier.
// Exécution : `npm test` (node --test, type stripping natif, sans dépendance).
//
// Les cas couverts sont ceux de la ligue, pas des cas théoriques :
// 4 équipes en salle, 3 ou 4 matchs par journée, avec des journées déjà
// converties ou des affiches épinglées.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateRoundRobinPairs, type Pair } from './roundRobin';
import { distributePairsOverDays, expectedPairCount, type DaySpec } from './distribute';

const TEAMS = ['USPG', 'SDHC', 'HCO', 'HCP'];

/** Aplatit le round-robin en une liste d'affiches. */
function pairsFor(teams: string[], doubleRound: boolean): Pair[] {
  return generateRoundRobinPairs(teams, { doubleRound }).flat();
}

/** Fabrique N journées de `slotsPerDay` créneaux libres. */
function days(count: number, slotsPerDay: number): DaySpec[] {
  return Array.from({ length: count }, (_, d) => ({
    date: `2026-10-${String(d + 1).padStart(2, '0')}`,
    matchday: d + 1,
    slotIds: Array.from({ length: slotsPerDay }, (_, s) => `d${d + 1}s${s + 1}`),
    fixed: Array.from({ length: slotsPerDay }, () => null),
  }));
}

function allPlaced(r: ReturnType<typeof distributePairsOverDays>): Pair[] {
  return r.days.flatMap((d) => d.assignments.map((a) => a.pair).filter((p): p is Pair => p != null));
}

function key(p: Pair): string {
  return p.home < p.away ? `${p.home}|${p.away}` : `${p.away}|${p.home}`;
}

// --- comptes attendus -------------------------------------------------------

test('expectedPairCount : 4 équipes = 6 affiches en aller simple, 12 en aller-retour', () => {
  assert.equal(expectedPairCount(4, false), 6);
  assert.equal(expectedPairCount(4, true), 12);
  assert.equal(expectedPairCount(1, false), 0);
});

// --- le cas qui échouait avant ---------------------------------------------

test('4 équipes, 3 matchs/jour : les 3 créneaux sont remplis, pas seulement 2', () => {
  // L'ancien code prenait le 1er tour du round-robin = 2 paires pour 3 slots.
  const r = distributePairsOverDays(pairsFor(TEAMS, false), days(2, 3), { seed: 1 });
  assert.equal(r.unplaced.length, 0);
  assert.equal(r.emptySlots, 0);
  for (const d of r.days) {
    assert.equal(d.assignments.filter((a) => a.pair != null).length, 3);
  }
});

test('aller simple : les 6 affiches sortent exactement une fois, sans doublon', () => {
  const r = distributePairsOverDays(pairsFor(TEAMS, false), days(2, 3), { seed: 7 });
  const keys = allPlaced(r).map(key);
  assert.equal(keys.length, 6);
  assert.equal(new Set(keys).size, 6);
});

test('aller-retour sur 4 journées de 3 : 12 affiches, chaque équipe joue 6 fois', () => {
  const r = distributePairsOverDays(pairsFor(TEAMS, true), days(4, 3), { seed: 3 });
  const placed = allPlaced(r);
  assert.equal(placed.length, 12);
  assert.equal(r.unplaced.length, 0);

  const perTeam = new Map<string, number>();
  for (const p of placed) {
    perTeam.set(p.home, (perTeam.get(p.home) ?? 0) + 1);
    perTeam.set(p.away, (perTeam.get(p.away) ?? 0) + 1);
  }
  for (const t of TEAMS) assert.equal(perTeam.get(t), 6, `${t} doit jouer 6 matchs`);
});

test('format de la saison dernière (3 journées de 4) : chaque équipe joue 2 fois par journée', () => {
  const r = distributePairsOverDays(pairsFor(TEAMS, true), days(3, 4), { seed: 11 });
  assert.equal(allPlaced(r).length, 12);
  for (const d of r.days) {
    const perTeam = new Map<string, number>();
    for (const a of d.assignments) {
      if (!a.pair) continue;
      perTeam.set(a.pair.home, (perTeam.get(a.pair.home) ?? 0) + 1);
      perTeam.set(a.pair.away, (perTeam.get(a.pair.away) ?? 0) + 1);
    }
    for (const t of TEAMS) {
      assert.equal(perTeam.get(t), 2, `${t} doit jouer 2 fois le ${d.date}`);
    }
  }
});

test('aller et retour d une même affiche ne tombent pas le même jour', () => {
  const r = distributePairsOverDays(pairsFor(TEAMS, true), days(4, 3), { seed: 5 });
  for (const d of r.days) {
    const seen = new Set<string>();
    for (const a of d.assignments) {
      if (!a.pair) continue;
      const k = key(a.pair);
      assert.ok(!seen.has(k), `${k} apparaît deux fois le ${d.date}`);
      seen.add(k);
    }
  }
});

// --- protection de l'existant : le cœur de « on peut modifier sans risque » --

test('un créneau converti n est jamais réécrit et son affiche n est pas reprogrammée', () => {
  const spec = days(2, 3);
  const joue: Pair = { home: 'HCO', away: 'HCP' };
  spec[0].fixed[1] = joue; // journée 1, 2e créneau : match déjà joué

  const r = distributePairsOverDays(pairsFor(TEAMS, false), spec, { seed: 2 });

  const slot = r.days[0].assignments[1];
  assert.deepEqual(slot.pair, joue, 'le créneau figé doit être intact');
  assert.equal(slot.fixed, true);

  // L'affiche figée ne doit pas ressortir ailleurs.
  const others = r.days
    .flatMap((d) => d.assignments)
    .filter((a) => !a.fixed && a.pair != null)
    .map((a) => key(a.pair!));
  assert.ok(!others.includes(key(joue)), 'HCO-HCP ne doit pas être reprogrammé');

  // Et le total reste correct : 6 affiches distinctes en tout.
  const keys = allPlaced(r).map(key);
  assert.equal(new Set(keys).size, 6);
});

test('une affiche épinglée reste à sa place exacte', () => {
  const spec = days(2, 3);
  const derby: Pair = { home: 'USPG', away: 'SDHC' };
  spec[1].fixed[2] = derby; // dernier créneau de la 2e journée

  const r = distributePairsOverDays(pairsFor(TEAMS, false), spec, { seed: 9 });
  assert.deepEqual(r.days[1].assignments[2].pair, derby);
  assert.equal(r.days[1].assignments[2].fixed, true);
});

// --- diagnostics pour le bandeau de couverture ------------------------------

test('pas assez de créneaux : les affiches restantes sont signalées', () => {
  const r = distributePairsOverDays(pairsFor(TEAMS, true), days(3, 3), { seed: 1 });
  assert.equal(r.unplaced.length, 3, '12 affiches pour 9 créneaux');
  assert.ok(r.warnings.some((w) => w.includes('sans créneau')));
});

test('trop de créneaux : les places vides sont signalées', () => {
  const r = distributePairsOverDays(pairsFor(TEAMS, false), days(3, 3), { seed: 1 });
  assert.equal(r.emptySlots, 3, '6 affiches pour 9 créneaux');
  assert.ok(r.warnings.some((w) => w.includes('vide')));
});

// --- rejouabilité -----------------------------------------------------------

test('même graine = même tirage (reproductible et vérifiable)', () => {
  const a = distributePairsOverDays(pairsFor(TEAMS, true), days(4, 3), { seed: 42 });
  const b = distributePairsOverDays(pairsFor(TEAMS, true), days(4, 3), { seed: 42 });
  assert.deepEqual(allPlaced(a), allPlaced(b));
});

test('graines différentes = tirages différents', () => {
  const a = distributePairsOverDays(pairsFor(TEAMS, true), days(4, 3), { seed: 1 });
  const b = distributePairsOverDays(pairsFor(TEAMS, true), days(4, 3), { seed: 999 });
  assert.notDeepEqual(allPlaced(a), allPlaced(b));
});

// --- robustesse -------------------------------------------------------------

test('nombre de créneaux variable d une journée à l autre', () => {
  const spec: DaySpec[] = [
    { date: '2026-10-01', matchday: 1, slotIds: ['a1', 'a2', 'a3', 'a4'], fixed: [null, null, null, null] },
    { date: '2026-10-08', matchday: 2, slotIds: ['b1', 'b2'], fixed: [null, null] },
  ];
  const r = distributePairsOverDays(pairsFor(TEAMS, false), spec, { seed: 4 });
  assert.equal(allPlaced(r).length, 6);
  assert.equal(r.unplaced.length, 0);
  assert.equal(r.emptySlots, 0);
});

test('aucune équipe inscrite : ne casse pas', () => {
  const r = distributePairsOverDays([], days(2, 3), { seed: 1 });
  assert.equal(allPlaced(r).length, 0);
  assert.equal(r.emptySlots, 6);
});

test('les journées sont traitées dans l ordre chronologique quel que soit l ordre d entrée', () => {
  const spec = days(3, 3).reverse();
  const r = distributePairsOverDays(pairsFor(TEAMS, false), spec, { seed: 6 });
  const dates = r.days.map((d) => d.date);
  assert.deepEqual(dates, [...dates].sort());
});
