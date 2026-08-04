import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentSeason,
  currentSeasonLabel,
  currentSeasonLabelShort,
  formatSeasonLabel,
  formatSeasonLabelShort,
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

test('les helpers de libellé courant dérivent bien de currentSeason', () => {
  const d = new Date('2026-10-01T08:00:00Z');
  assert.equal(currentSeasonLabel(d), '2026–2027');
  assert.equal(currentSeasonLabelShort(d), "'26–'27");
});
