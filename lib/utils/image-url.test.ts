import { test } from 'node:test';
import assert from 'node:assert/strict';
import { thumbnailUrl, optimizeImageUrl } from './image-url';

// URL réellement stockée en base pour une photo du bureau (relevée le
// 2026-09-17) : aucune transformation, donc l'original 447×544 / 31 Ko partait
// tel quel dans une pastille de 36 px.
const BUREAU_PHOTO =
  'https://res.cloudinary.com/dujza5z5m/image/upload/v1780219043/lrh/qg63alvpv5lj88dl7ejb.jpg';

// Logo de club uploadé avec un preset : les transforms existent déjà.
const CLUB_LOGO =
  'https://res.cloudinary.com/dujza5z5m/image/upload/w_200,h_200,c_fill,f_auto,q_auto/v1779679991/lrh/vxziagkiohcsfjysp0er.png';

test('thumbnailUrl — demande le double de la taille CSS, pour les écrans 2×', () => {
  // 36 px affichés → 72 demandés → arrondi au palier 96.
  assert.match(thumbnailUrl(BUREAU_PHOTO, 36), /\/upload\/f_auto,q_auto:eco,w_96\//);
});

test('thumbnailUrl — arrondit à une échelle bornée plutôt qu\'à la taille exacte', () => {
  // Le coût Cloudinary se compte en dérivés générés : deux tailles CSS du même
  // palier doivent produire UNE seule URL (cf. règle n°2). 36 et 40 px — les
  // deux tailles d'avatar des commissions — se rejoignent ainsi sur w_96.
  assert.equal(thumbnailUrl(BUREAU_PHOTO, 36), thumbnailUrl(BUREAU_PHOTO, 40));
  assert.match(thumbnailUrl(BUREAU_PHOTO, 40), /w_96\//);

  // Une taille franchement plus petite descend d'un palier : inutile de servir
  // 96 px de large à une pastille de 28.
  assert.match(thumbnailUrl(BUREAU_PHOTO, 28), /w_64\//);

  // La garantie qui compte : quelle que soit la taille demandée dans l'app, le
  // nombre d'URLs distinctes reste celui de l'échelle, pas celui des appels.
  const sizes = Array.from({ length: 240 }, (_, i) => i + 1);
  const urls = new Set(sizes.map((s) => thumbnailUrl(BUREAU_PHOTO, s)));
  assert.ok(urls.size <= 10, `échelle bornée attendue, obtenu ${urls.size} URLs`);
});

test('thumbnailUrl — ne réécrit pas un format ni une largeur déjà imposés', () => {
  // Le logo porte déjà `w_200,f_auto,q_auto` : on ne doit pas les écraser,
  // sinon on déforme un cadrage choisi à l'upload (`c_fill`).
  const out = thumbnailUrl(CLUB_LOGO, 56);
  assert.ok(out.includes('c_fill'), 'le cadrage doit survivre');
  assert.ok(out.includes('w_200'), 'la largeur existante prime');
  assert.equal((out.match(/w_/g) ?? []).length, 1, 'pas de largeur en double');
});

test('thumbnailUrl — inoffensif sur une URL non Cloudinary', () => {
  // Les logos de club peuvent être des fichiers locaux, et les futurs uploads
  // passeront par Cloudflare Images : dans les deux cas on rend l'URL telle
  // quelle plutôt que de fabriquer une URL invalide.
  assert.equal(thumbnailUrl('/assets/clubs/hco.png', 40), '/assets/clubs/hco.png');
  const cf = 'https://imagedelivery.net/abc123/xyz789/public';
  assert.equal(thumbnailUrl(cf, 40), cf);
  assert.equal(thumbnailUrl('', 40), '');
});

test('optimizeImageUrl — la largeur demandée est celle passée, sans doublement', () => {
  // `thumbnailUrl` double pour la densité d'écran ; l'helper de bas niveau,
  // lui, prend la largeur au pied de la lettre (utilisé pour les grandes
  // images, où l'appelant a déjà fait le calcul).
  assert.match(optimizeImageUrl(BUREAU_PHOTO, 480, 'eco'), /w_480\//);
});
