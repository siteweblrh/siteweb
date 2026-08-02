// Ces tests verrouillent la règle qui rend la fusion brouillon/officiel sûre :
// publier et dépublier sont symétriques TANT QU'AUCUN SCORE N'EST SAISI, et un
// refus porte toujours sa raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeMatchdays,
  isPlayed,
  matchdayLabel,
  type MatchdaySlot,
} from './matchdayState';

let seq = 0;
function slot(
  date: string,
  matchday: number,
  over: Partial<MatchdaySlot> = {},
): MatchdaySlot {
  return {
    slotId: `s${++seq}`,
    matchday,
    date,
    plannedHomeClubId: null,
    plannedAwayClubId: null,
    match: null,
    ...over,
  };
}

const drawn = { plannedHomeClubId: 'A', plannedAwayClubId: 'B' };
const scheduled = { match: { status: 'SCHEDULED', homeScore: null, awayScore: null } };
const withScore = { match: { status: 'SCHEDULED', homeScore: 3, awayScore: 1 } };

test('une journée sans affiche est « vide »', () => {
  const [j] = computeMatchdays([slot('2026-09-06', 1), slot('2026-09-06', 1)]);
  assert.equal(j.status, 'vide');
  assert.equal(matchdayLabel(j.status), 'à tirer');
  assert.equal(j.counts.drawn, 0);
});

test('un créneau à moitié rempli ne compte pas comme tiré', () => {
  const [j] = computeMatchdays([
    slot('2026-09-06', 1, { plannedHomeClubId: 'A' }),
  ]);
  assert.equal(j.counts.drawn, 0);
  assert.equal(j.status, 'vide');
});

test('affiches posées mais rien de publié : « tirée », publiable', () => {
  const [j] = computeMatchdays([
    slot('2026-09-06', 1, drawn),
    slot('2026-09-06', 1, drawn),
  ]);
  assert.equal(j.status, 'tiree');
  assert.equal(j.actions.publish.allowed, true);
  assert.equal(j.actions.unpublish.allowed, false);
});

test('une publication partielle est signalée comme telle', () => {
  const [j] = computeMatchdays([
    slot('2026-09-06', 1, { ...drawn, ...scheduled }),
    slot('2026-09-06', 1, drawn),
  ]);
  assert.equal(j.status, 'partielle');
  // Il reste un créneau à publier ET un à dépublier : les deux sont ouverts.
  assert.equal(j.actions.publish.allowed, true);
  assert.equal(j.actions.unpublish.allowed, true);
});

test('journée entièrement publiée sans score : dépublier reste permis', () => {
  const [j] = computeMatchdays([
    slot('2026-09-06', 1, { ...drawn, ...scheduled }),
    slot('2026-09-06', 1, { ...drawn, ...scheduled }),
  ]);
  assert.equal(j.status, 'publiee');
  assert.equal(j.actions.unpublish.allowed, true);
  assert.equal(j.actions.publish.allowed, false);
});

test('un seul score saisi verrouille la journée entière', () => {
  const [j] = computeMatchdays([
    slot('2026-09-06', 1, { ...drawn, ...withScore }),
    slot('2026-09-06', 1, { ...drawn, ...scheduled }),
  ]);
  assert.equal(j.status, 'jouee');
  assert.equal(j.actions.unpublish.allowed, false);
});

test('un refus porte toujours sa raison', () => {
  const [j] = computeMatchdays([slot('2026-09-06', 1, { ...drawn, ...withScore })]);
  const u = j.actions.unpublish;
  assert.equal(u.allowed, false);
  if (u.allowed === false) {
    assert.match(u.reason, /score/);
  }
});

test('le pluriel de la raison suit le nombre de matchs joués', () => {
  const [un] = computeMatchdays([slot('2026-09-06', 1, { ...drawn, ...withScore })]);
  const [deux] = computeMatchdays([
    slot('2026-09-13', 2, { ...drawn, ...withScore }),
    slot('2026-09-13', 2, { ...drawn, ...withScore }),
  ]);
  const a = un.actions.unpublish, b = deux.actions.unpublish;
  if (a.allowed === false && b.allowed === false) {
    assert.match(a.reason, /^Un match/);
    assert.match(b.reason, /^2 matchs/);
  } else {
    assert.fail('les deux refus étaient attendus');
  }
});

test('un score de 0-0 compte comme joué — c’est un résultat', () => {
  const [j] = computeMatchdays([
    slot('2026-09-06', 1, {
      ...drawn,
      match: { status: 'SCHEDULED', homeScore: 0, awayScore: 0 },
    }),
  ]);
  assert.equal(j.status, 'jouee');
});

test('le statut FINISHED suffit, même sans score saisi', () => {
  assert.equal(isPlayed({ status: 'FINISHED', homeScore: null, awayScore: null }), true);
  assert.equal(isPlayed({ status: 'SCHEDULED', homeScore: null, awayScore: null }), false);
});

test('les journées sortent triées par date, pas par rang de calendrier', () => {
  // Cas réel : une compétition un dimanche sur deux hérite des rangs 1, 3, 5.
  const js = computeMatchdays([
    slot('2026-10-04', 5, drawn),
    slot('2026-09-06', 1, drawn),
    slot('2026-09-20', 3, drawn),
  ]);
  assert.deepEqual(js.map((j) => j.date), ['2026-09-06', '2026-09-20', '2026-10-04']);
  assert.deepEqual(js.map((j) => j.matchday), [1, 3, 5]);
});

test('les créneaux d’une même journée sont regroupés, leurs ids conservés', () => {
  const js = computeMatchdays([
    slot('2026-09-06', 1, drawn),
    slot('2026-09-06', 1, drawn),
    slot('2026-09-20', 3, drawn),
  ]);
  assert.equal(js.length, 2);
  assert.equal(js[0].slotIds.length, 2);
  assert.equal(js[1].slotIds.length, 1);
});
