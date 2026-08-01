// Ces tests verrouillent la classe de bugs qui a coûté la journée du
// 2026-08-01 : des conditions d'affichage éparpillées, qui divergeaient les
// unes des autres. Une action interdite doit TOUJOURS porter sa raison.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeCompetitionState,
  type CompetitionStateInput,
  type StateSlot,
} from './competitionState';

function day(date: string, matchday: number, n: number, fill?: Partial<StateSlot>): StateSlot[] {
  return Array.from({ length: n }, () => ({
    date, matchday,
    plannedHomeClubId: null, plannedAwayClubId: null,
    isPinned: false, converted: false,
    ...fill,
  }));
}

function paired(date: string, matchday: number, pairs: [string, string][], fill?: Partial<StateSlot>): StateSlot[] {
  return pairs.map(([h, a]) => ({
    date, matchday,
    plannedHomeClubId: h, plannedAwayClubId: a,
    isPinned: false, converted: false,
    ...fill,
  }));
}

const RR = (slots: StateSlot[], doubleRound = true): CompetitionStateInput =>
  ({ format: 'CHAMPIONSHIP_PLAYOFFS', teamCount: 4, doubleRound, slots });
const CUP = (slots: StateSlot[]): CompetitionStateInput =>
  ({ format: 'CUP', teamCount: 4, doubleRound: false, slots });

function reason(a: { allowed: boolean; reason?: string }): string {
  assert.equal(a.allowed, false, 'action attendue interdite');
  assert.ok(a.reason && a.reason.length > 10, 'un refus doit porter une raison lisible');
  return a.reason!;
}

// --- le refus porte toujours sa raison -------------------------------------

test('aucune équipe : tirage et ajustement refusés, avec la raison', () => {
  const s = computeCompetitionState({ ...RR([]), teamCount: 0 });
  assert.match(reason(s.actions.draw), /équipe/i);
  assert.match(reason(s.actions.autoFit), /équipe/i);
  assert.equal(s.currentStep, 'teams');
});

test('compétition absente du calendrier : on renvoie vers les dates', () => {
  const s = computeCompetitionState(RR([]));
  assert.match(reason(s.actions.draw), /créneau/i);
  assert.equal(s.currentStep, 'dates');
});

test('compte de créneaux faux : tirage refusé, ajustement AUTORISÉ', () => {
  // Le bug du jour : l'ajustement était masqué au lieu d'être proposé.
  const s = computeCompetitionState(RR([...day('2026-09-06', 1, 5)]));
  reason(s.actions.draw);
  assert.equal(s.actions.autoFit.allowed, true, "l'ajustement doit rester la porte de sortie");
});

test('une journée déjà publiée ne bloque pas l ajustement', () => {
  // Régression du 2026-08-01 : canAutoFit exigeait convertedCount === 0.
  const slots = [
    ...day('2026-09-06', 1, 4, { converted: true }),
    ...day('2026-09-20', 3, 5),
  ];
  assert.equal(computeCompetitionState(RR(slots)).actions.autoFit.allowed, true);
});

// --- championnat à phase finale --------------------------------------------

test('championnat : les créneaux de phase finale ne bloquent pas le tirage', () => {
  // Régression du 2026-08-01 : 14 créneaux pour 12 affiches était vu comme un
  // excédent, ce qui grisait le tirage juste après l'ajustement.
  const slots = [
    ...day('2026-09-06', 1, 4), ...day('2026-09-20', 3, 4),
    ...day('2026-10-04', 5, 4), ...day('2026-10-18', 7, 2),
  ];
  const s = computeCompetitionState(RR(slots));
  assert.equal(s.actions.draw.allowed, true);
  assert.equal(s.coverage.slotDelta, 0);
  assert.equal(s.currentStep, 'draw');
});

// --- coupe : la forme compte autant que le total ---------------------------

test('coupe : bon total mais mauvaise forme → tirage refusé avec la forme attendue', () => {
  // Le cas réel : 3 créneaux le 22/11 et 1 le 17/01. Total juste, tableau
  // impossible.
  const slots = [...day('2026-11-22', 9, 3), ...day('2027-01-17', 13, 1)];
  const s = computeCompetitionState(CUP(slots));
  assert.equal(s.coverage.slotDelta, 0, 'le total est bon');
  assert.equal(s.shapeWrong, true);
  assert.match(reason(s.actions.draw), /2 puis 2/);
  assert.deepEqual(s.actualShape, [3, 1]);
  assert.deepEqual(s.wantedShape, [2, 2]);
});

test('coupe bien formée : tirage autorisé', () => {
  const slots = [...day('2026-11-22', 9, 2), ...day('2027-01-17', 13, 2)];
  const s = computeCompetitionState(CUP(slots));
  assert.equal(s.shapeWrong, false);
  assert.equal(s.actions.draw.allowed, true);
});

test('coupe : premier tour tiré = étape tirage terminée', () => {
  const slots = [
    ...paired('2026-11-22', 9, [['A', 'B'], ['C', 'D']]),
    ...day('2027-01-17', 13, 2),
  ];
  const s = computeCompetitionState(CUP(slots));
  assert.equal(s.steps.find((x) => x.id === 'draw')!.status, 'done');
  assert.equal(s.currentStep, 'publish');
});

test('coupe : effectif hors puissance de 2 refusé partout', () => {
  const s = computeCompetitionState({ ...CUP(day('2026-11-22', 9, 3)), teamCount: 6 });
  assert.match(reason(s.actions.draw), /2, 4, 8 ou 16/);
  assert.match(reason(s.actions.autoFit), /2, 4, 8 ou 16/);
});

// --- progression -----------------------------------------------------------

test('les étapes décrivent où on en est', () => {
  const slots = [
    ...paired('2026-09-06', 1, [['A', 'B'], ['C', 'D'], ['A', 'C'], ['B', 'D']], { converted: true }),
    ...paired('2026-09-20', 3, [['A', 'D'], ['B', 'C'], ['B', 'A'], ['D', 'C']]),
    ...paired('2026-10-04', 5, [['C', 'A'], ['D', 'B'], ['D', 'A'], ['C', 'B']]),
    ...day('2026-10-18', 7, 2),
  ];
  const s = computeCompetitionState(RR(slots));
  const by = Object.fromEntries(s.steps.map((x) => [x.id, x]));
  assert.equal(by.teams.status, 'done');
  assert.equal(by.dates.status, 'done');
  assert.equal(by.draw.status, 'done');
  assert.equal(by.publish.status, 'doing');
  assert.match(by.publish.detail, /4 sur 14/);
  assert.equal(s.currentStep, 'publish');
});

test('effacer le tirage : refusé s il n y a rien à effacer', () => {
  const vide = computeCompetitionState(RR(day('2026-09-06', 1, 4)));
  assert.match(reason(vide.actions.clear), /Aucun tirage/);

  const tire = computeCompetitionState(RR(paired('2026-09-06', 1, [['A', 'B']])));
  assert.equal(tire.actions.clear.allowed, true);
});

test('le détail des dates est lisible sans calcul mental', () => {
  const s = computeCompetitionState(CUP([...day('2026-11-22', 9, 3), ...day('2027-01-17', 13, 1)]));
  assert.match(s.steps.find((x) => x.id === 'dates')!.detail, /3\+1 au lieu de 2\+2/);
});
