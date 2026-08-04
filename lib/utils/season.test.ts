import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentSeason,
  formatSeasonLabel,
  formatSeasonLabelShort,
  isValidSeason,
} from './season';

test('currentSeason — avant septembre, on est encore sur la saison finissante', () => {
  // 4 août 2026, 12:00 Réunion → la saison gazon 2026-2027 n'a pas commencé.
  assert.equal(currentSeason(new Date('2026-08-04T08:00:00Z')), '2025-2026');
  assert.equal(currentSeason(new Date('2026-01-15T08:00:00Z')), '2025-2026');
  assert.equal(currentSeason(new Date('2026-06-30T08:00:00Z')), '2025-2026');
});

test('currentSeason — bascule au 1er septembre', () => {
  assert.equal(currentSeason(new Date('2026-08-31T19:00:00Z')), '2025-2026');
  // 1er septembre 00:30 heure Réunion = 31 août 20:30 UTC. La bascule doit
  // suivre le fuseau Réunion, pas celui du serveur Vercel (UTC) : sans ça, le
  // site passait à la saison suivante 4 h trop tôt.
  assert.equal(currentSeason(new Date('2026-08-31T20:30:00Z')), '2026-2027');
  assert.equal(currentSeason(new Date('2026-12-25T08:00:00Z')), '2026-2027');
});

test('formatSeasonLabel — en-dash, et null propagé', () => {
  assert.equal(formatSeasonLabel('2025-2026'), '2025–2026');
  assert.equal(formatSeasonLabel(null), null);
  assert.equal(formatSeasonLabel(undefined), null);
});

test('formatSeasonLabelShort — forme apostrophée, fallback si format inattendu', () => {
  assert.equal(formatSeasonLabelShort('2025-2026'), "'25–'26");
  assert.equal(formatSeasonLabelShort(''), '');
  assert.equal(formatSeasonLabelShort('saison-test'), 'saison–test');
});

test('isValidSeason — garde-fou de la saisie admin season.current', () => {
  assert.equal(isValidSeason('2026-2027'), true);
  assert.equal(isValidSeason('  2026-2027  '), true);
  // Vide = mode automatique, pas une saison.
  assert.equal(isValidSeason(''), false);
  assert.equal(isValidSeason(null), false);
  assert.equal(isValidSeason(undefined), false);
  // Années non consécutives, ou format libre : refusé plutôt que d'aller
  // interroger la base avec une valeur qui n'y sera jamais.
  assert.equal(isValidSeason('2026-2028'), false);
  assert.equal(isValidSeason('2026/2027'), false);
  assert.equal(isValidSeason('26-27'), false);
  assert.equal(isValidSeason('saison en cours'), false);
});
