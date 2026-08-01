// Le tirage d'une coupe doit être un VRAI tirage (mélange), pas un placement
// par têtes de série : la ligue veut pouvoir le faire devant les clubs.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  expectedCupMatchCount, firstRoundMatchCount, isBalancedBracket,
  cupLayout, drawFirstRound,
} from './bracket';

test('nombre de matchs : N-1, plus la petite finale', () => {
  assert.equal(expectedCupMatchCount(4, true), 4);
  assert.equal(expectedCupMatchCount(4, false), 3);
  assert.equal(expectedCupMatchCount(8, true), 8);
  assert.equal(expectedCupMatchCount(2, true), 1, 'à 2 équipes, pas de 3e place');
  assert.equal(expectedCupMatchCount(1, true), 0);
});

test('premier tour : la moitié des équipes', () => {
  assert.equal(firstRoundMatchCount(4), 2);
  assert.equal(firstRoundMatchCount(8), 4);
});

test('tableau équilibré = puissance de 2', () => {
  for (const n of [2, 4, 8, 16]) assert.ok(isBalancedBracket(n), `${n} doit passer`);
  for (const n of [0, 1, 3, 5, 6, 12]) assert.ok(!isBalancedBracket(n), `${n} doit échouer`);
});

test('disposition des journées : la petite finale accompagne la finale', () => {
  assert.deepEqual(cupLayout(4, true), [2, 2], '2 demies, puis finale + 3e place');
  assert.deepEqual(cupLayout(4, false), [2, 1]);
  assert.deepEqual(cupLayout(8, true), [4, 2, 2]);
  assert.deepEqual(cupLayout(6, true), [], 'effectif non équilibré');
});

test('tirage du premier tour : chaque équipe une fois et une seule', () => {
  const teams = ['USPG', 'SDHC', 'HCO', 'HCP'];
  const pairs = drawFirstRound(teams, 7);
  assert.equal(pairs.length, 2);
  const engaged = pairs.flatMap((p) => [p.home, p.away]).sort();
  assert.deepEqual(engaged, [...teams].sort());
});

test('même graine = même tirage, graines différentes = tirages différents', () => {
  const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  assert.deepEqual(drawFirstRound(teams, 42), drawFirstRound(teams, 42));
  assert.notDeepEqual(drawFirstRound(teams, 1), drawFirstRound(teams, 12345));
});

test('le tirage mélange vraiment (pas l ordre d inscription)', () => {
  const teams = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const identity = drawFirstRound(teams);           // sans graine : ordre conservé
  assert.deepEqual(identity[0], { home: 'A', away: 'B' });
  // Avec une graine, au moins un tirage sur quelques essais doit différer.
  const differs = [1, 2, 3, 4, 5].some(
    (seed) => JSON.stringify(drawFirstRound(teams, seed)) !== JSON.stringify(identity),
  );
  assert.ok(differs, 'la graine doit changer les appariements');
});

test('moins de 2 équipes : aucun match', () => {
  assert.deepEqual(drawFirstRound(['A']), []);
  assert.deepEqual(drawFirstRound([]), []);
});
