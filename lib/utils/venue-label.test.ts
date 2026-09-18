import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVenueLabel,
  normalizeVenueLabelLoose,
  sharesSurface,
} from './venue-label';

const GAZON = { supportsGazon: true, supportsSalle: false };
const SALLE = { supportsGazon: false, supportsSalle: true };

test('strict — les 5 saisies de « Ravine à Malheur » se rejoignent', () => {
  // Les libellés réellement présents en prod avant le nettoyage du 2026-09-18.
  const saisies = [
    'Ravine à Malheur',
    'Ravine a Malheur',
    'RAVINE À MALHEUR',
    '  Ravine à  Malheur ',
    'Ravine-à-Malheur',
  ];
  for (const saisie of saisies) {
    assert.equal(normalizeVenueLabel(saisie), 'ravine a malheur', `échec sur « ${saisie} »`);
  }
});

test('strict — la ville en minuscules ne crée pas un lieu différent', () => {
  // Une des lignes supprimées portait « la possession » au lieu de
  // « La Possession », ce qui suffisait à passer sous le radar.
  assert.equal(normalizeVenueLabel('la possession'), normalizeVenueLabel('La Possession'));
});

test('souple — « Stade Manès » et « Stade de Manès » sont le même terrain', () => {
  assert.equal(
    normalizeVenueLabelLoose('Stade Manès'),
    normalizeVenueLabelLoose('Stade de Manès'),
  );
  assert.equal(normalizeVenueLabelLoose('Stade de Manès'), 'stade manes');
});

test('souple — les particules sautent, pas les mots porteurs de sens', () => {
  assert.equal(normalizeVenueLabelLoose('Stade de la Palmeraie'), 'stade palmeraie');
  assert.equal(normalizeVenueLabelLoose('Complexe Gymnase du Guillaume'), 'complexe gymnase guillaume');
  // Deux terrains réellement distincts doivent le rester.
  assert.notEqual(
    normalizeVenueLabelLoose('Gymnase Daniel Narcisse'),
    normalizeVenueLabelLoose('Complexe Sportif Daniel Narcisse'),
  );
  assert.notEqual(
    normalizeVenueLabelLoose('Stade de la Palmeraie'),
    normalizeVenueLabelLoose('Stade Manès'),
  );
});

test('surfaces — gazon et salle homonymes cohabitent, deux gazon non', () => {
  // Le cas légitime conservé au nettoyage : une ligne gazon + une ligne salle
  // pour « Ravine à Malheur ».
  assert.equal(sharesSurface(GAZON, SALLE), false);
  assert.equal(sharesSurface(GAZON, GAZON), true);
  assert.equal(sharesSurface(SALLE, SALLE), true);
  // Un terrain mixte recoupe les deux.
  const MIXTE = { supportsGazon: true, supportsSalle: true };
  assert.equal(sharesSurface(MIXTE, GAZON), true);
  assert.equal(sharesSurface(MIXTE, SALLE), true);
});
