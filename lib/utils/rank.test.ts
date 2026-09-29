import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedRanks } from './rank';

test('sharedRanks — ex aequo au même rang, le suivant saute', () => {
  // Buteurs U13/U15 du 26/09/2026, tels que classés par la ligue.
  assert.deepEqual(sharedRanks([5, 4, 4, 3, 2, 2, 2, 1, 1]), [1, 2, 2, 4, 5, 5, 5, 8, 8]);
  // Buteurs U10/U11.
  assert.deepEqual(sharedRanks([9, 3, 3, 2, 2, 1, 1, 1]), [1, 2, 2, 4, 4, 6, 6, 6]);
});

test('sharedRanks — cas limites', () => {
  assert.deepEqual(sharedRanks([]), []);
  assert.deepEqual(sharedRanks([7]), [1]);
  assert.deepEqual(sharedRanks([3, 2, 1]), [1, 2, 3]);
  assert.deepEqual(sharedRanks([2, 2, 2]), [1, 1, 1]);
});
