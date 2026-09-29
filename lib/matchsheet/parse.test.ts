import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMatchSheet, splitPerson, cleanLine } from './parse';

/**
 * J02 du Championnat de la Réunion Salle 2026-2027 (20/09/2026), au format de
 * la ligue. Reconstituée depuis l'extrait de docs/SAISIE_RAPIDE_JOURNEE.md §4
 * et les données saisies par scripts/salle-2026-j02.mjs — y compris ses pièges :
 * la ligne « n° 4 Kenny Iva » et le carton de « Jerry Celestin ».
 */
const J02 = `
Journée 2 — dimanche 20 septembre 2026

### Entente SDHC/HHS/Zarlors (Domicile) 0 – 8 HCO (Visiteurs)

* **Score final :** 0 - 8
* **Entente : Aucun buteur**
* **Buteurs HCO (8 buts) :**
* **Fabien Paulo** (#9) : **4 buts**
* **Julien Michel** (#2) : **2 buts**
* **Jean Charles Hoarau** (#10) : **1 but**
* **Mickael Ranaivoson** (#5) : **1 but**

### HCP (Domicile) 5 – 8 USPG (Visiteurs)

* **Score final :** 5 - 8
* **Buteurs HCP (5 buts) :**
* **Jean Yves Filo** (#22) : **2 buts**
* **Mathieu Ledoux** (#18) : **1 but**
* **Cedric Hoarau** (#11) : **1 but**
* **Louis Lebeau** (#14) : **1 but**
* **Buteurs USPG (8 buts) :**
* **Johannick Futol** (#9) : **5 buts**
* **Bertrand Vidot** (#10) : **2 buts**
* **Nathael Riviere** (#17) : **1 but**
* **Sanctions enregistrées (USPG) :**
* **Johannick Futol** (#9) : Carton vert
* **Nathael Riviere** (#17) : Carton vert

### HCP (Domicile) 10 – 4 Entente SDHC/HHS/Zarlors (Visiteurs)

* **Score final :** 10 - 4
* **Buteurs HCP (10 buts) :**
* **Mathieu Ledoux** (#18) : **3 buts**
* **Damien Ducheman** (#5) : **3 buts**
* **Jean Yves Filo** (#22) : **2 buts**
* **Cedric Hoarau** (#11) : **1 but**
* **Louis Lebeau** (#14) : **1 but**
* n° 4 Kenny Iva
* **Buteurs Entente SDHC/HHS/Zarlors (4 buts) :**
* **Alexandre Orange** (#17) : **3 buts**
* **Fabrice Poyer** (#3) : **1 but**
* **Sanctions enregistrées (Entente) :**
* **Alexandre Orange** (#17) : Carton vert

### USPG (Domicile) 3 – 9 HCO (Visiteurs)

* **Score final :** 3 - 9
* **Buteurs USPG (3 buts) :**
* **Mike Begue** (#11) : **1 but**
* **Bertrand Vidot** (#10) : **1 but**
* **Johannick Futol** (#9) : **1 but**
* **Buteurs HCO (9 buts) :**
* **Fabien Paulo** (#9) : **3 buts**
* **Julien Saminadin** (#6) : **3 buts**
* **Thomas Saminadin** (#11) : **2 buts**
* **Julien Michel** (#2) : **1 but**
* **Sanctions enregistrées (USPG) :**
* **Mike Begue** (#11) : Carton vert
* **Jerry Celestin** : Carton vert
* **Blessure signalée (USPG) :**
* **Bertrand Vidot** (#10) : Choc balle orteil droit
`;

test('J02 — quatre rencontres, scores et équipes du titre', () => {
  const { matches } = parseMatchSheet(J02);
  assert.equal(matches.length, 4);
  assert.deepEqual(
    matches.map((m) => [m.homeText, m.homeScore, m.awayScore, m.awayText]),
    [
      ['Entente SDHC/HHS/Zarlors', 0, 8, 'HCO'],
      ['HCP', 5, 8, 'USPG'],
      ['HCP', 10, 4, 'Entente SDHC/HHS/Zarlors'],
      ['USPG', 3, 9, 'HCO'],
    ],
  );
});

test('J02 — « Entente : Aucun buteur » est un zéro déclaré, pas une ligne ignorée', () => {
  const [m1] = parseMatchSheet(J02).matches;
  assert.deepEqual(m1.noScorer.map((n) => n.teamText), ['Entente']);
  assert.equal(m1.goals.reduce((s, g) => s + (g.count ?? 0), 0), 8);
});

test('J02 — buteurs : nom, maillot, nombre, équipe de section', () => {
  const m2 = parseMatchSheet(J02).matches[1];
  assert.deepEqual(m2.goals[0], {
    name: 'Jean Yves Filo', jersey: 22, count: 2, teamText: 'HCP', line: m2.goals[0].line,
  });
  assert.deepEqual(m2.announcedTotals.map((t) => [t.teamText, t.count]), [['HCP', 5], ['USPG', 8]]);
  assert.deepEqual(m2.cards.map((c) => [c.name, c.kind, c.teamText]), [
    ['Johannick Futol', 'GREEN', 'USPG'],
    ['Nathael Riviere', 'GREEN', 'USPG'],
  ]);
});

test('J02 — la ligne « n° 4 Kenny Iva » est lue SANS nombre de buts (§5.2)', () => {
  const m3 = parseMatchSheet(J02).matches[2];
  const kenny = m3.goals.find((g) => g.name === 'Kenny Iva');
  assert.ok(kenny, 'la ligne doit être remontée, pas avalée');
  assert.equal(kenny.count, null);
  assert.equal(kenny.jersey, 4);
});

test('J02 — carton sans maillot, blessure avec description', () => {
  const m4 = parseMatchSheet(J02).matches[3];
  assert.deepEqual(m4.cards.map((c) => [c.name, c.jersey]), [['Mike Begue', 11], ['Jerry Celestin', null]]);
  assert.deepEqual(m4.injuries.map((i) => [i.name, i.jersey, i.teamText, i.description]), [
    ['Bertrand Vidot', 10, 'USPG', 'Choc balle orteil droit'],
  ]);
});

test('J02 — l’en-tête libre avant la première rencontre est ignoré sans bloquer', () => {
  const { issues } = parseMatchSheet(J02);
  assert.deepEqual(issues.map((i) => [i.line, i.blocking]), [[2, false]]);
});

test('Rassemblement jeunes (26/09/2026) — format court, prénoms seuls', () => {
  const text = `
Match 1 — AZO 2-1 HHS
Buteurs AZO :
- Robin : 1
- Esma : 1
Buteurs HHS :
- Noëlla : 1
Match 2 — AZO 3-0 HHS
Buteurs AZO :
- Esma : 2 buts
- Robin : 1 but
HHS : Aucun buteur
Sanctions (HHS) :
- Clément : carton jaune
`;
  const { matches, issues } = parseMatchSheet(text);
  assert.deepEqual(issues, []);
  assert.equal(matches.length, 2);
  assert.deepEqual(matches[0].goals.map((g) => [g.teamText, g.name, g.count]), [
    ['AZO', 'Robin', 1], ['AZO', 'Esma', 1], ['HHS', 'Noëlla', 1],
  ]);
  assert.deepEqual(matches[1].noScorer.map((n) => n.teamText), ['HHS']);
  assert.deepEqual(matches[1].cards.map((c) => [c.name, c.kind, c.teamText]), [['Clément', 'YELLOW', 'HHS']]);
});

test('Garde-fous du parseur — ce qui ne se devine pas bloque', () => {
  const text = `
HCP 10 - 4 USPG
Score final : 10 - 3
Paul Martin : 2 buts
Sanctions (HCP) :
Paul Martin : avertissement
`;
  const { issues } = parseMatchSheet(text);
  assert.deepEqual(
    issues.map((i) => [i.line, i.blocking]),
    [[3, true], [4, true], [6, true]],
  );
  assert.match(issues[0].message, /contredit le titre/);
  assert.match(issues[1].message, /hors section/);
  assert.match(issues[2].message, /Carton vert/);
});

test('splitPerson / cleanLine — tolérances de format', () => {
  assert.deepEqual(splitPerson('Alexandre Orange (#17)'), { name: 'Alexandre Orange', jersey: 17 });
  assert.deepEqual(splitPerson('n° 4 Kenny Iva'), { name: 'Kenny Iva', jersey: 4 });
  assert.deepEqual(splitPerson('Esma'), { name: 'Esma', jersey: null });
  assert.equal(cleanLine('* **Score final :** 10 – 4'), 'Score final : 10 – 4');
  assert.equal(cleanLine('### HCP (Domicile) 10 — 4 USPG'), 'HCP (Domicile) 10 — 4 USPG');
});

test('Tirets et séparateurs équivalents dans un titre', () => {
  for (const dash of ['-', '–', '—']) {
    const { matches } = parseMatchSheet(`HCO 3 ${dash} 1 USPG`);
    assert.deepEqual([matches[0].homeText, matches[0].homeScore, matches[0].awayScore, matches[0].awayText], ['HCO', 3, 1, 'USPG']);
  }
  // Un nom composé à tiret n'est pas un titre de rencontre.
  const { matches } = parseMatchSheet('HCO 3-1 USPG\nButeurs HCO :\nJean-Yves Filo : 3 buts');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].goals[0].name, 'Jean-Yves Filo');
});
