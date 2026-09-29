import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMatchSheet } from './parse';
import {
  resolveMatchday,
  splitSheetName,
  memberCategoryFor,
  provisionalLicense,
  type ResolveClub,
  type ResolveInput,
  type ResolveMatch,
  type ResolveMember,
} from './resolve';

/* Données inventées, calquées sur la base au 20/09/2026. */
const club = (id: string, name: string, shortCode: string, parents: ResolveClub['parentClubs'] = []): ResolveClub => ({
  id, name, shortCode, slug: shortCode.toLowerCase(), kind: parents.length ? 'ENTENTE' : 'STANDALONE', parentClubs: parents,
});
const SDHC = { id: 'sdhc', name: 'Saint-Denis Hockey Club', shortCode: 'SDHC' };
const HHS_P = { id: 'hhs', name: 'Hockey Horizon Sud', shortCode: 'HHS' };
const AZO_P = { id: 'azo', name: 'Association Zarlors de l’Ouest', shortCode: 'AZO' };
const CLUBS: ResolveClub[] = [
  club('hco', 'Hockey Club de l’Ouest', 'HCO'),
  club('uspg', 'US Possession Gazon', 'USPG'),
  club('hcp', 'Hockey Club du Port', 'HCP'),
  { ...club('ent', 'Entente SDHC/HHS/AZO', 'ENT', [SDHC, HHS_P, AZO_P]), slug: 'entente-sdhc-hhs-azo' },
  club('hhs', 'Hockey Horizon Sud', 'HHS'),
  club('azo', 'Association Zarlors de l’Ouest', 'AZO'),
];
const m = (id: string, firstName: string, lastName: string, clubId: string, jerseyNumber: number | null = null): ResolveMember =>
  ({ id, firstName, lastName, clubId, jerseyNumber });
const MEMBERS: ResolveMember[] = [
  m('saminadin-j', 'Julien', 'Saminadin', 'hco', 13),
  m('salindier', 'Cedric', 'Salindier', 'hco', 6),
  m('paulo', 'Fabien', 'Paulo', 'hco', 9),
  m('celestin-q', 'Quentin', 'Celestin', 'uspg', 1),
  m('vidot', 'Bertrand', 'Vidot', 'uspg', 81),
  m('orange', 'Alexandre', 'Orange', 'sdhc', 11),
  m('esma', 'Esma', 'Trebalage', 'azo'),
  m('robin', 'Robin', 'Labetan Zollet', 'azo'),
  m('noella', 'Noëlla', '', 'hhs'),
];
const match = (id: string, home: string, away: string, hour: number, extra: Partial<ResolveMatch> = {}): ResolveMatch => ({
  id, homeClubId: home, awayClubId: away, kickoffAt: new Date(Date.UTC(2026, 8, 20, hour)),
  homeScore: null, awayScore: null, status: 'SCHEDULED', counts: { goals: 0, cards: 0, injuries: 0 }, ...extra,
});

function run(text: string, matches: ResolveMatch[], extra: Partial<ResolveInput> = {}) {
  return resolveMatchday({
    competitionLabel: 'Test', matchday: 2, sheet: parseMatchSheet(text), matches,
    clubs: CLUBS, members: MEMBERS, decisions: {}, confirmedOverwrite: [], ...extra,
  });
}
const blocking = (r: ReturnType<typeof run>) =>
  [...r.plan.alerts, ...r.plan.matches.flatMap((x) => x.alerts)].filter((a) => a.level === 'blocking').map((a) => a.message);
const warnings = (r: ReturnType<typeof run>) =>
  r.plan.matches.flatMap((x) => x.alerts).filter((a) => a.level === 'warning').map((a) => a.message);

test('§5.3 — Saminadin #6 : attribué sur le NOM, jamais au #6 de Salindier', () => {
  const r = run('USPG 0-3 HCO\nButeurs HCO :\nJulien Saminadin (#6) : 3 buts\nUSPG : Aucun buteur', [match('m4', 'uspg', 'hco', 8)]);
  assert.deepEqual(blocking(r), []);
  assert.ok(r.plan.ready);
  assert.deepEqual(r.writes[0].goals.map((g) => g.person), Array(3).fill({ type: 'member', memberId: 'saminadin-j' }));
  assert.match(warnings(r).join('\n'), /#6 sur la feuille, #13 en base/);
});

test('§5.5 — « Jerry Celestin » ne se rattache PAS d’office à Quentin', () => {
  const r = run('USPG 0-0 HCO\nSanctions (USPG) :\nJerry Celestin : Carton vert', [match('m4', 'uspg', 'hco', 8)]);
  assert.equal(r.plan.ready, false);
  assert.equal(r.plan.questions.length, 1);
  assert.deepEqual(
    [r.plan.questions[0].reason, r.plan.questions[0].candidates.map((c) => c.id)],
    ['partial', ['celestin-q']],
  );
  // Le choix « nom libre » débloque, et le carton garde le nom de la feuille.
  const key = r.plan.questions[0].key;
  const ok = run('USPG 0-0 HCO\nSanctions (USPG) :\nJerry Celestin : Carton vert', [match('m4', 'uspg', 'hco', 8)], {
    decisions: { [key]: { type: 'free' } },
  });
  assert.ok(ok.plan.ready);
  assert.deepEqual(ok.writes[0].cards[0].person, { type: 'free', name: 'Jerry Celestin' });
});

test('§5.2 — une ligne de buteur sans nombre bloque (Kenny Iva)', () => {
  const r = run('HCO 1-0 USPG\nButeurs HCO :\nFabien Paulo (#9) : 1 but\nn° 4 Kenny Iva\nUSPG : Aucun buteur', [match('m', 'hco', 'uspg', 8)]);
  assert.equal(r.plan.ready, false);
  assert.match(blocking(r).join('\n'), /Kenny Iva.*pas de nombre de buts/);
});

test('§5.1 — buts listés ≠ score, contrôlé par camp', () => {
  const r = run('HCO 3-0 USPG\nButeurs HCO :\nFabien Paulo : 2 buts\nUSPG : Aucun buteur', [match('m', 'hco', 'uspg', 8)]);
  assert.match(blocking(r).join('\n'), /HCO : 2 buts listés pour un score de 3/);
});

test('§5.4 — joueur absent d’une entente : création proposée dans ses clubs membres', () => {
  const text = 'HCP 0-1 Entente SDHC/HHS/Zarlors\nButeurs Entente (1 but) :\nFabrice Poyer (#3) : 1 but\nHCP : Aucun buteur';
  const r = run(text, [match('m3', 'hcp', 'ent', 8)]);
  const q = r.plan.questions[0];
  assert.equal(q.reason, 'absent');
  assert.deepEqual(q.createIn.map((c) => c.label), ['SDHC', 'HHS', 'AZO']);
  const created = run(text, [match('m3', 'hcp', 'ent', 8)], { decisions: { [q.key]: { type: 'create', clubId: 'sdhc' } } });
  assert.ok(created.plan.ready);
  assert.deepEqual(created.creations.map((c) => [c.firstName, c.lastName, c.clubId, c.jerseyNumber]), [['Fabrice', 'Poyer', 'sdhc', 3]]);
  // Le but reste marqué POUR l'entente, le joueur est licencié au SDHC.
  assert.equal(created.writes[0].goals[0].clubId, 'ent');
});

test('Entente — un joueur licencié dans un club membre est trouvé (Orange, SDHC)', () => {
  const r = run('HCP 0-1 Entente SDHC/HHS/Zarlors\nButeurs Entente :\nAlexandre Orange (#17) : 1 but\nHCP : Aucun buteur', [match('m3', 'hcp', 'ent', 8)]);
  assert.ok(r.plan.ready, blocking(r).join(' | '));
  assert.deepEqual(r.writes[0].goals[0].person, { type: 'member', memberId: 'orange' });
});

test('§5.6 — un match déjà saisi exige une confirmation explicite', () => {
  const saisi = match('m', 'hco', 'uspg', 8, { homeScore: 2, awayScore: 0, status: 'FINISHED', counts: { goals: 2, cards: 0, injuries: 0 } });
  const text = 'HCO 1-0 USPG\nButeurs HCO :\nFabien Paulo : 1 but\nUSPG : Aucun buteur';
  const r = run(text, [saisi]);
  assert.equal(r.plan.ready, false);
  assert.deepEqual(r.plan.overwriteMatchIds, ['m']);
  assert.deepEqual(r.plan.matches[0].existing, { goals: 2, cards: 0, injuries: 0, score: '2-0', status: 'FINISHED' });
  assert.ok(run(text, [saisi], { confirmedOverwrite: ['m'] }).plan.ready);
});

test('Domicile/extérieur inversés par rapport au calendrier → bloquant, pas de score retourné en douce', () => {
  const r = run('USPG 0-1 HCO\nButeurs HCO :\nFabien Paulo : 1 but\nUSPG : Aucun buteur', [match('m', 'hco', 'uspg', 8)]);
  assert.match(blocking(r).join('\n'), /c'est HCO qui reçoit USPG/);
});

test('Rassemblement jeunes — affiches répétées appariées dans l’ordre, prénom seul reconnu', () => {
  const text = 'AZO 2-1 HHS\nButeurs AZO :\nEsma : 1\nRobin : 1\nButeurs HHS :\nNoëlla : 1\nAZO 1-0 HHS\nButeurs AZO :\nEsma : 1\nHHS : Aucun buteur';
  const r = run(text, [match('n2', 'azo', 'hhs', 10), match('n1', 'azo', 'hhs', 9)].sort((a, b) => +a.kickoffAt - +b.kickoffAt));
  assert.deepEqual(blocking(r), []);
  assert.deepEqual(r.writes.map((w) => [w.matchId, w.homeScore, w.awayScore]), [['n1', 2, 1], ['n2', 1, 0]]);
  assert.deepEqual(r.writes[0].goals[0].person, { type: 'member', memberId: 'esma' });
  assert.match(warnings(r).join('\n'), /identifié\(e\) par « Esma » seul/);
});

test('Une même personne ne génère qu’UNE question pour toute la journée', () => {
  const text = 'HCO 1-0 USPG\nButeurs HCO :\nKevin Nouveau : 1 but\nUSPG : Aucun buteur\nSanctions (HCO) :\nKevin Nouveau : carton jaune';
  const r = run(text, [match('m', 'hco', 'uspg', 8)]);
  assert.equal(r.plan.questions.length, 1);
});

test('Utilitaires — nom, catégorie, licence provisoire', () => {
  assert.deepEqual(splitSheetName('Jean Yves Filo'), { firstName: 'Jean Yves', lastName: 'Filo' });
  assert.deepEqual(splitSheetName('Ryan FILO'), { firstName: 'Ryan', lastName: 'Filo' });
  assert.deepEqual(splitSheetName('Robin LABETAN ZOLLET'), { firstName: 'Robin', lastName: 'Labetan Zollet' });
  assert.deepEqual(splitSheetName('Esma'), { firstName: 'Esma', lastName: '' });
  assert.equal(memberCategoryFor('U10-U12'), 'U11');
  assert.equal(memberCategoryFor('U14'), 'U14');
  assert.equal(memberCategoryFor('Senior'), 'SENIOR');
  assert.equal(provisionalLicense('USPG', 'Nathael', 'Rivière'), 'PROV-USPG-RIVIERE-N');
  assert.equal(provisionalLicense('AZO', 'Esma', ''), 'PROV-AZO-ESMA');
});
