import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVenueLabel,
  normalizeVenueLabelLoose,
  sharesSurface,
  findVenueDuplicate,
  venueDuplicateMessage,
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

// La table de prod au 2026-09-18, apres le nettoyage des grappes 1 et 2.
const TABLE = [
  { id: 'v-ravine-gazon', name: 'Ravine à Malheur', city: 'La Possession', ...GAZON },
  { id: 'v-ravine-salle', name: 'Ravine à Malheur', city: 'La Possession', ...SALLE },
  { id: 'v-manes', name: 'Stade Manès', city: 'Le Port', ...GAZON },
  { id: 'v-chatoire', name: 'Terrain de La Chatoire', city: 'Le Tampon', ...GAZON },
];

test('findVenueDuplicate — une creation inedite passe', () => {
  const hit = findVenueDuplicate(
    { name: 'Stade Municipal', city: 'Le Port', ...GAZON },
    TABLE,
  );
  assert.equal(hit, null);
});

test('findVenueDuplicate — le meme nom sur la meme surface est bloque', () => {
  const hit = findVenueDuplicate(
    { name: 'RAVINE A MALHEUR', city: 'la possession', ...GAZON },
    TABLE,
  );
  assert.equal(hit?.id, 'v-ravine-gazon');
  assert.equal(hit?.exact, true);
});

test("findVenueDuplicate — une particule d'ecart est bloquee, en souple", () => {
  const hit = findVenueDuplicate({ name: 'Stade de Manès', city: 'Le Port', ...GAZON }, TABLE);
  assert.equal(hit?.id, 'v-manes');
  assert.equal(hit?.exact, false);
});

test('findVenueDuplicate — la surface departage les homonymes', () => {
  // Une 2e ligne SALLE « Ravine a Malheur » ferait doublon...
  assert.equal(
    findVenueDuplicate({ name: 'Ravine à Malheur', city: 'La Possession', ...SALLE }, TABLE)?.id,
    'v-ravine-salle',
  );
  // ...mais la ligne gazon et la ligne salle existantes cohabitent : chacune
  // ne voit pas l'autre comme son doublon.
  assert.equal(
    findVenueDuplicate(
      { name: 'Ravine à Malheur', city: 'La Possession', ...GAZON },
      TABLE,
      'v-ravine-gazon',
    ),
    null,
  );
});

test('ignoreId — modifier une fiche sans la renommer reste possible', () => {
  // LE piege du garde-fou sur updateVenue : sans ignoreId, corriger l'adresse
  // de « Stade Manes » serait refuse au motif qu'il ressemble a lui-meme,
  // rendant la fiche impossible a editer.
  const hit = findVenueDuplicate(
    { name: 'Stade Manès', city: 'Le Port', ...GAZON },
    TABLE,
    'v-manes',
  );
  assert.equal(hit, null);
});

test("ignoreId — renommer vers le nom d'un AUTRE terrain reste bloque", () => {
  // On edite la Chatoire et on tente de la renommer « Stade Manes » au Port.
  const hit = findVenueDuplicate(
    { name: 'Stade Manès', city: 'Le Port', ...GAZON },
    TABLE,
    'v-chatoire',
  );
  assert.equal(hit?.id, 'v-manes');
});

test('venueDuplicateMessage — nomme le terrain existant et sa commune', () => {
  const exact = venueDuplicateMessage({ id: 'x', name: 'Stade Manès', city: 'Le Port', exact: true });
  assert.ok(exact.includes('Stade Manès') && exact.includes('Le Port'), exact);
  const near = venueDuplicateMessage({ id: 'x', name: 'Stade Manès', city: 'Le Port', exact: false });
  assert.ok(near.includes('très proche'), near);
  assert.notEqual(exact, near);
});
