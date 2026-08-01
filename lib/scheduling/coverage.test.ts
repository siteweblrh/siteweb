// Le bandeau de couverture est ce qui rend le calendrier utilisable sans
// connaître la théorie des round-robins. Ses messages doivent donc être justes
// dans tous les cas — d'où ces tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeCoverage, type CoverageSlot } from './coverage';

function slots(n: number, fill?: Partial<CoverageSlot>): CoverageSlot[] {
  return Array.from({ length: n }, () => ({
    plannedHomeClubId: null,
    plannedAwayClubId: null,
    isPinned: false,
    converted: false,
    ...fill,
  }));
}

/** n créneaux portant des affiches toutes distinctes. */
function drawn(pairs: [string, string][]): CoverageSlot[] {
  return pairs.map(([h, a]) => ({
    plannedHomeClubId: h,
    plannedAwayClubId: a,
    isPinned: false,
    converted: false,
  }));
}

test('moins de 2 équipes : on demande des inscriptions', () => {
  const c = computeCoverage(0, false, slots(6));
  assert.equal(c.status, 'no-teams');
  assert.match(c.hint ?? '', /Inscrivez/);
});

test('compétition absente du calendrier', () => {
  const c = computeCoverage(4, false, []);
  assert.equal(c.status, 'no-slots');
  assert.equal(c.expectedPairs, 6);
});

test('il manque des créneaux : le nombre manquant est annoncé', () => {
  // 4 équipes aller-retour = 12 affiches, 9 créneaux configurés.
  const c = computeCoverage(4, true, slots(9));
  assert.equal(c.status, 'missing-slots');
  assert.equal(c.slotDelta, 3);
  assert.match(c.message, /il manque 3 créneaux/);
});

test('trop de créneaux : on propose d en retirer', () => {
  const c = computeCoverage(4, false, slots(9));
  assert.equal(c.status, 'extra-slots');
  assert.equal(c.slotDelta, -3);
  assert.match(c.hint ?? '', /Retirez/);
});

test('compte juste mais tirage pas lancé', () => {
  const c = computeCoverage(4, false, slots(6));
  assert.equal(c.status, 'not-drawn');
  assert.match(c.hint ?? '', /tirage/i);
});

test('tirage complet : plus rien à corriger', () => {
  const c = computeCoverage(4, false, drawn([
    ['A', 'B'], ['C', 'D'], ['A', 'C'],
    ['B', 'D'], ['A', 'D'], ['B', 'C'],
  ]));
  assert.equal(c.status, 'ready');
  assert.equal(c.hint, null);
  assert.equal(c.duplicates.length, 0);
});

test('doublon détecté en aller simple', () => {
  const c = computeCoverage(4, false, drawn([
    ['A', 'B'], ['B', 'A'], ['C', 'D'],
    ['A', 'C'], ['B', 'D'], ['A', 'D'],
  ]));
  assert.equal(c.duplicates.length, 1, 'A-B programmé deux fois');
  assert.equal(c.status, 'partial');
});

test('en aller-retour, deux occurrences d une affiche sont normales', () => {
  const c = computeCoverage(2, true, drawn([['A', 'B'], ['B', 'A']]));
  assert.equal(c.duplicates.length, 0);
  assert.equal(c.status, 'ready');
});

test('tirage partiel : on invite à relancer', () => {
  const half = drawn([['A', 'B'], ['C', 'D'], ['A', 'C']]);
  const c = computeCoverage(4, false, [...half, ...slots(3)]);
  assert.equal(c.status, 'partial');
  assert.match(c.message, /3 sur 6/);
});

test('les matchs déjà convertis sont comptés et signalés', () => {
  const s = drawn([
    ['A', 'B'], ['C', 'D'], ['A', 'C'],
    ['B', 'D'], ['A', 'D'], ['B', 'C'],
  ]);
  s[0].converted = true;
  s[1].converted = true;
  const c = computeCoverage(4, false, s);
  assert.equal(c.convertedCount, 2);
  assert.match(c.message, /2 déjà convertis/);
});
