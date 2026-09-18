import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderContent } from './markdown';

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
