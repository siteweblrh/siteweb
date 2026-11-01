import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderContent, sanitizeUserHtml } from './markdown';

test('liens internes — ni nouvel onglet, ni rel="ugc"', () => {
  // Le maillage interne d'un article ecrit par la ligue n'est pas du contenu
  // genere par les visiteurs.
  for (const href of ['/classements', '/competitions', '#resultats', 'https://www.lrh.re/jeunes', 'https://lrh.re/']) {
    const html = renderContent(`<p><a href="${href}">lien</a></p>`);
    assert.ok(!html.includes('target='), `target present pour ${href} : ${html}`);
    assert.ok(!html.includes('rel='), `rel present pour ${href} : ${html}`);
    assert.ok(html.includes(`href="${href}"`), `href perdu pour ${href} : ${html}`);
  }
});

test('liens externes — nouvel onglet et rel complet', () => {
  const html = renderContent(
    '<p><a href="https://www.facebook.com/profile.php?id=100008469214274">Facebook</a></p>',
  );
  assert.ok(html.includes('target="_blank"'), html);
  assert.ok(html.includes('rel="noopener noreferrer ugc"'), html);
});

test('un lien protocol-relative est traite comme externe', () => {
  // `//ailleurs.re` sort bien du site : il doit garder noopener.
  const html = renderContent('<p><a href="//ailleurs.re/page">ailleurs</a></p>');
  assert.ok(html.includes('target="_blank"'), html);
  assert.ok(html.includes('noopener'), html);
});

test('un hote qui imite le notre reste externe', () => {
  // `lrh.re.evil.com` ne doit pas passer pour un lien interne.
  const html = renderContent('<p><a href="https://lrh.re.evil.com/x">piege</a></p>');
  assert.ok(html.includes('target="_blank"'), html);
  assert.ok(html.includes('noopener'), html);
});

test('le sanitizer bloque toujours javascript: et les iframes hors YouTube', () => {
  // Non-regression : la correction ne doit pas ouvrir de breche.
  const js = renderContent('<p><a href="javascript:alert(1)">x</a></p>');
  assert.ok(!js.includes('javascript:'), js);
  const iframe = renderContent('<iframe src="https://evil.com/x"></iframe>');
  assert.ok(!iframe.includes('evil.com'), iframe);
  const yt = renderContent('<iframe src="https://www.youtube.com/embed/abc"></iframe>');
  assert.ok(yt.includes('youtube.com/embed/abc'), yt);
});

// Forme exacte d'un tableau produit par TipTap TableKit (2026-11-01) :
// style min-width, <colgroup>, <p> dans les cellules, colspan/rowspan.
const TIPTAP_TABLE =
  '<table style="min-width: 75px"><colgroup><col style="min-width: 25px"><col style="min-width: 25px"></colgroup>' +
  '<tbody><tr><th colspan="2" rowspan="1"><p>Catégorie</p></th></tr>' +
  '<tr><td colspan="1" rowspan="1"><p>U11</p></td><td colspan="1" rowspan="1"><p>2-1</p></td></tr></tbody></table>';

test('sanitizeUserHtml — un tableau TipTap survit, cellules fusionnées comprises', () => {
  const out = sanitizeUserHtml(TIPTAP_TABLE);
  assert.match(out, /<th colspan="2" rowspan="1"><p>Catégorie<\/p><\/th>/);
  assert.match(out, /<td colspan="1" rowspan="1"><p>U11<\/p><\/td>/);
  // Largeurs inline et colgroup retirés : sans effet à l'affichage.
  assert.doesNotMatch(out, /min-width|colgroup|<col\b/);
});

test('sanitizeUserHtml — colspan n\'ouvre pas la porte aux autres attributs', () => {
  const out = sanitizeUserHtml('<table><tbody><tr><td colspan="2" onclick="x()" style="color:red">a</td></tr></tbody></table>');
  assert.match(out, /<td colspan="2">a<\/td>/);
});

test('renderContent — chaque tableau est enveloppé une fois dans un conteneur défilant', () => {
  const out = renderContent(TIPTAP_TABLE + '<p>entre</p>' + TIPTAP_TABLE);
  assert.equal(out.match(/<div class="lrh-table-scroll"><table>/g)?.length, 2);
  assert.equal(out.match(/<\/table><\/div>/g)?.length, 2);
});

test('sanitizeUserHtml — le HTML stocké ne contient jamais le conteneur d\'affichage', () => {
  assert.doesNotMatch(sanitizeUserHtml(TIPTAP_TABLE), /lrh-table-scroll/);
});
