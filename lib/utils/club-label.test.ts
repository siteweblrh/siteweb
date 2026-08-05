import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactClubLabel, ultraShortClubLabel } from './club-label';

test('compactClubLabel — le shortCode prime, c\'est lui l\'abréviation attendue', () => {
  // Les quatre clubs cités par l'user le 2026-08-05.
  assert.equal(compactClubLabel({ name: "Hockey Club de l'Ouest", shortCode: 'HCO' }), 'HCO');
  assert.equal(
    compactClubLabel({ name: 'Union Sportive de la Pointe des Galets', shortCode: 'USPG' }),
    'USPG',
  );
  assert.equal(compactClubLabel({ name: 'Hockey Club de la Possession', shortCode: 'HCP' }), 'HCP');
  assert.equal(compactClubLabel({ name: 'Saint-Denis Hockey Club', shortCode: 'SDHC' }), 'SDHC');
});

test('compactClubLabel — le shortCode composé des ententes s\'affiche avec une barre', () => {
  // Saisi `HCP_HCD` en base parce que c'est une clé technique ; le nom réel du
  // club s'écrit « Entente HCP / HCD ». L'underscore ne doit pas fuiter en UI.
  assert.equal(compactClubLabel({ name: 'Entente HCP / HCD', shortCode: 'HCP_HCD' }), 'HCP/HCD');
  assert.equal(ultraShortClubLabel({ name: 'Entente SDHC / HHS', shortCode: 'SDHC_HHS' }), 'SDHC/HHS');
});

test('compactClubLabel — sans shortCode, retire le préfixe éditorial et tronque', () => {
  assert.equal(compactClubLabel({ name: 'Hockey Club de la Dominicaine' }), 'de la Dominicaine');
  assert.equal(compactClubLabel({ name: 'Entente Possession Le Port' }), 'Possession Le Port');
  const long = compactClubLabel({ name: 'Association Sportive Municipale de Sainte-Marie' });
  assert.ok(long.length <= 18, `attendu ≤ 18 caractères, reçu « ${long} »`);
  assert.ok(long.endsWith('…'));
});

test('compactClubLabel — club inconnu : la règle de qualification remplace le nom', () => {
  // Un match de phase finale est planifié avant que ses participants soient
  // connus (cf. project_match_equipes_optionnelles).
  assert.equal(compactClubLabel(null, 'Vainqueur demi-finale 1', 30), 'Vainqueur demi-finale 1');
  assert.equal(compactClubLabel(null), 'À déterminer');
});

test('ultraShortClubLabel — repli sur les initiales', () => {
  assert.equal(ultraShortClubLabel({ name: 'Saint-Denis Hockey Club' }), 'SDHC');
});
