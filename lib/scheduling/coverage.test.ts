// Le bandeau de couverture est ce qui rend le calendrier utilisable sans
// connaître la théorie des round-robins ni celle des tableaux. Ses messages
// doivent donc être justes pour les DEUX formats — c'est précisément la
// confusion qui lui faisait annoncer 6 matchs pour une coupe à 4 équipes.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeCoverage, type CoverageSlot, type CoverageConfig } from './coverage';

function slots(n: number, fill?: Partial<CoverageSlot>): CoverageSlot[] {
  return Array.from({ length: n }, () => ({
    plannedHomeClubId: null,
    plannedAwayClubId: null,
    isPinned: false,
    converted: false,
    ...fill,
  }));
}

function drawn(pairs: [string, string][]): CoverageSlot[] {
  return pairs.map(([h, a]) => ({
    plannedHomeClubId: h,
    plannedAwayClubId: a,
    isPinned: false,
    converted: false,
  }));
}

const RR = (teamCount: number, doubleRound: boolean, finalsSlots = 0): CoverageConfig =>
  ({ kind: 'round-robin', teamCount, doubleRound, finalsSlots });
const CUP = (teamCount: number, includeThirdPlace = true): CoverageConfig =>
  ({ kind: 'cup', teamCount, includeThirdPlace });

// --- championnat -----------------------------------------------------------

test('championnat : 4 équipes aller simple = 6 matchs', () => {
  assert.equal(computeCoverage(RR(4, false), slots(6)).expectedMatches, 6);
});

test('championnat : 4 équipes aller-retour = 12 matchs', () => {
  assert.equal(computeCoverage(RR(4, true), slots(12)).expectedMatches, 12);
});

test('moins de 2 équipes : on demande des inscriptions', () => {
  const c = computeCoverage(RR(0, false), slots(6));
  assert.equal(c.status, 'no-teams');
  assert.match(c.hint ?? '', /Inscrivez/);
});

test('compétition absente du calendrier', () => {
  const c = computeCoverage(RR(4, false), []);
  assert.equal(c.status, 'no-slots');
  assert.equal(c.expectedMatches, 6);
});

test('il manque des créneaux : le nombre manquant est annoncé', () => {
  const c = computeCoverage(RR(4, true), slots(9));
  assert.equal(c.status, 'missing-slots');
  assert.equal(c.slotDelta, 3);
  assert.match(c.message, /il manque 3 créneaux/);
});

test('trop de créneaux : on propose d en retirer', () => {
  const c = computeCoverage(RR(4, false), slots(9));
  assert.equal(c.status, 'extra-slots');
  assert.equal(c.slotDelta, -3);
  assert.match(c.hint ?? '', /Retirez/);
});

test('compte juste mais tirage pas lancé', () => {
  assert.equal(computeCoverage(RR(4, false), slots(6)).status, 'not-drawn');
});

test('tirage complet : plus rien à corriger', () => {
  const c = computeCoverage(RR(4, false), drawn([
    ['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D'], ['A', 'D'], ['B', 'C'],
  ]));
  assert.equal(c.status, 'ready');
  assert.equal(c.hint, null);
});

test('doublon détecté en aller simple', () => {
  const c = computeCoverage(RR(4, false), drawn([
    ['A', 'B'], ['B', 'A'], ['C', 'D'], ['A', 'C'], ['B', 'D'], ['A', 'D'],
  ]));
  assert.equal(c.duplicates.length, 1);
  assert.equal(c.status, 'partial');
});

test('en aller-retour, deux occurrences d une affiche sont normales', () => {
  const c = computeCoverage(RR(2, true), drawn([['A', 'B'], ['B', 'A']]));
  assert.equal(c.duplicates.length, 0);
  assert.equal(c.status, 'ready');
});

test('les matchs déjà convertis sont comptés et signalés', () => {
  const s = drawn([
    ['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D'], ['A', 'D'], ['B', 'C'],
  ]);
  s[0].converted = true;
  s[1].converted = true;
  const c = computeCoverage(RR(4, false), s);
  assert.equal(c.convertedCount, 2);
  assert.match(c.message, /2 déjà convertis/);
});

test('les créneaux de phase finale ne comptent pas comme un excédent', () => {
  const regular = drawn([
    ['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D'], ['A', 'D'], ['B', 'C'],
    ['B', 'A'], ['D', 'C'], ['C', 'A'], ['D', 'B'], ['D', 'A'], ['C', 'B'],
  ]);
  const c = computeCoverage(RR(4, true, 2), [...regular, ...slots(2)]);
  assert.equal(c.status, 'ready');
  assert.equal(c.slotDelta, 0);
  assert.match(c.message, /dont 2 pour la phase finale/);
});

// --- coupe : le cas qui était faux -----------------------------------------

test('coupe 4 équipes avec 3e place = 4 matchs, pas 6', () => {
  const c = computeCoverage(CUP(4), slots(4));
  assert.equal(c.expectedMatches, 4, '2 demies + finale + 3e place');
  assert.equal(c.drawableMatches, 2, 'seul le 1er tour est tirable');
  assert.equal(c.slotDelta, 0);
  assert.equal(c.status, 'not-drawn');
});

test('coupe 4 équipes sans 3e place = 3 matchs', () => {
  assert.equal(computeCoverage(CUP(4, false), slots(3)).expectedMatches, 3);
});

test('coupe 8 équipes avec 3e place = 8 matchs', () => {
  const c = computeCoverage(CUP(8), slots(8));
  assert.equal(c.expectedMatches, 8, '4 quarts + 2 demies + finale + 3e place');
  assert.equal(c.drawableMatches, 4);
});

test('coupe : le premier tour tiré suffit à être prête', () => {
  // 2 demies tirées, 2 créneaux réservés pour finale et 3e place.
  const c = computeCoverage(CUP(4), [...drawn([['A', 'B'], ['C', 'D']]), ...slots(2)]);
  assert.equal(c.status, 'ready');
  assert.match(c.hint ?? '', /vainqueurs/);
});

test('coupe : effectif hors puissance de 2 refusé avec une explication', () => {
  const c = computeCoverage(CUP(6), slots(6));
  assert.equal(c.status, 'unbalanced-bracket');
  assert.match(c.message, /2, 4, 8 ou 16/);
});

test('coupe : il manque des créneaux', () => {
  const c = computeCoverage(CUP(4), slots(2));
  assert.equal(c.status, 'missing-slots');
  assert.equal(c.slotDelta, 2);
});

test('coupe : le message parle des tours suivants, pas de phase finale', () => {
  assert.match(computeCoverage(CUP(4), slots(4)).message, /pour les tours suivants/);
});
