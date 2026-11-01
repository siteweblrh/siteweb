import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCourseTime, formatCourseTime, parseCourseSheet, courseSheetText,
  courseRanks, groupCourseSessions,
} from './youth-course';

test('parseCourseTime — les écritures des feuilles du 31/10/2026', () => {
  assert.deepEqual(parseCourseTime('31,45 s'), { timeMs: 31450, approximate: false });
  assert.deepEqual(parseCourseTime('37,50 s'), { timeMs: 37500, approximate: false });
  assert.deepEqual(parseCourseTime('≈ 38 s'), { timeMs: 38000, approximate: true });
  assert.deepEqual(parseCourseTime('50 s'), { timeMs: 50000, approximate: false });
  assert.deepEqual(parseCourseTime('1 min 09'), { timeMs: 69000, approximate: false });
  assert.deepEqual(parseCourseTime('1 min 16,27 s'), { timeMs: 76270, approximate: false });
});

test('parseCourseTime — autres écritures courantes', () => {
  assert.deepEqual(parseCourseTime('25.49'), { timeMs: 25490, approximate: false });
  assert.deepEqual(parseCourseTime('1:16.27'), { timeMs: 76270, approximate: false });
  assert.deepEqual(parseCourseTime("1'09"), { timeMs: 69000, approximate: false });
  assert.deepEqual(parseCourseTime('~39'), { timeMs: 39000, approximate: true });
  assert.deepEqual(parseCourseTime('environ 39 s'), { timeMs: 39000, approximate: true });
});

test('parseCourseTime — illisible = null, jamais 0', () => {
  assert.equal(parseCourseTime(''), null);
  assert.equal(parseCourseTime('abandon'), null);
  assert.equal(parseCourseTime('0'), null);
  assert.equal(parseCourseTime('1 min 75'), null);
});

test('formatCourseTime — rendu fidèle à la feuille', () => {
  assert.equal(formatCourseTime(31450), '31,45 s');
  assert.equal(formatCourseTime(37500), '37,50 s');
  assert.equal(formatCourseTime(50000), '50 s');
  assert.equal(formatCourseTime(38000, true), '≈ 38 s');
  assert.equal(formatCourseTime(69000), '1 min 09 s');
  assert.equal(formatCourseTime(76270), '1 min 16,27 s');
  assert.equal(formatCourseTime(61050), '1 min 01,05 s');
});

test('parseCourseSheet — avec ou sans équipe, rang en tête ignoré, tabulations', () => {
  const { lines, errors } = parseCourseSheet(
    'Naël ; 31,45 s\n\n3\tLéna\tZarlor\t30,96 s\n  Mathéo | HHS 1 | 25,49  ',
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(lines, [
    { athleteName: 'Naël', team: null, timeMs: 31450, approximate: false },
    { athleteName: 'Léna', team: 'Zarlor', timeMs: 30960, approximate: false },
    { athleteName: 'Mathéo', team: 'HHS 1', timeMs: 25490, approximate: false },
  ]);
});

test('parseCourseSheet — erreurs signalées avec leur numéro de ligne', () => {
  const { lines, errors } = parseCourseSheet('Naël ; 31,45\nRobin\nJules ; vite\nnaël ; 40');
  assert.equal(lines.length, 1);
  assert.deepEqual(errors.map((e) => e.line), [2, 3, 4]);
  assert.match(errors[2].reason, /deux fois/);
});

test('courseSheetText — aller-retour avec parseCourseSheet', () => {
  const rows = [
    { athleteName: 'Robin', team: null, timeMs: 38000, approximate: true },
    { athleteName: 'Naël', team: null, timeMs: 31450, approximate: false },
    { athleteName: 'Jules', team: 'HHS', timeMs: 69000, approximate: false },
  ];
  const text = courseSheetText(rows);
  assert.equal(text.split('\n')[0], 'Naël ; 31,45 s');
  assert.deepEqual(parseCourseSheet(text).lines.map((l) => l.athleteName), ['Naël', 'Robin', 'Jules']);
  assert.deepEqual(parseCourseSheet(text).lines[1], rows[0]);
});

test('courseRanks — ex aequo au même chrono', () => {
  assert.deepEqual(courseRanks([{ timeMs: 1 }, { timeMs: 2 }, { timeMs: 2 }, { timeMs: 3 }]), [1, 2, 2, 4]);
});

test('groupCourseSessions — journée la plus récente d\'abord, U11 avant U15', () => {
  const j2 = { id: 'g2', date: '2026-10-10T00:00:00Z' };
  const j3 = { id: 'g3', date: '2026-10-31T00:00:00Z' };
  const row = (gathering: typeof j2, category: string, athleteName: string, timeMs: number) =>
    ({ gathering, category, athleteName, timeMs });
  const sessions = groupCourseSessions([
    row(j2, 'U11', 'A', 40000),
    row(j3, 'U15', 'B', 30000),
    row(j3, 'U11', 'C', 45000),
    row(j3, 'U11', 'D', 31000),
  ]);
  assert.deepEqual(sessions.map((s) => s.gathering.id), ['g3', 'g2']);
  assert.deepEqual(sessions[0].series.map((s) => s.category), ['U11', 'U15']);
  assert.deepEqual(sessions[0].series[0].rows.map((r) => r.athleteName), ['D', 'C']);
});
