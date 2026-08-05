import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMatchDay, MONTHS_SHORT } from './match-format';

test('MONTHS_SHORT — 12 mois, tous distincts', () => {
  // Le test qui aurait évité le défaut corrigé le 2026-08-05 : les
  // abréviations étaient dérivées d'un `slice(0, 3)` sur les noms complets,
  // qui rend « JUI » pour juin ET pour juillet.
  assert.equal(MONTHS_SHORT.length, 12);
  assert.equal(new Set(MONTHS_SHORT).size, 12);
});

test('formatMatchDay — jour de semaine, quantième ET mois', () => {
  // 5 août 2026 à 15:00 heure Réunion (UTC+4) = 11:00 UTC. C'est un mercredi.
  assert.equal(formatMatchDay(new Date('2026-08-05T11:00:00Z')), 'MER 05 AOÛT');
  // 6 juin 2026, un samedi — et son voisin de juillet, pour vérifier que les
  // deux mois ne s'écrivent pas pareil.
  assert.equal(formatMatchDay(new Date('2026-06-06T11:00:00Z')), 'SAM 06 JUIN');
  assert.equal(formatMatchDay(new Date('2026-07-04T11:00:00Z')), 'SAM 04 JUIL');
});

test('formatMatchDay — la date est celle de La Réunion, pas celle du runtime', () => {
  // 22:00 UTC le 4 août = 02:00 le 5 août à La Réunion (UTC+4). Un serveur
  // Vercel en UTC afficherait le 4 : c'est le piège que TZ Réunion évite.
  assert.equal(formatMatchDay(new Date('2026-08-04T22:00:00Z')), 'MER 05 AOÛT');
});
