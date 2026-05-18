#!/usr/bin/env node
/**
 * Redimensionne et compresse les logos clubs.
 *
 * Avant : PNG sources 1080x1080 à 6400x7309 = 250 KB à 930 KB par logo
 * (affichés à 30-40px réels sur le site). Détecté par PageSpeed comme cause
 * principale du LCP à 9.9s mobile.
 *
 * Après : 3 variantes WebP (64w, 128w, 256w) + un PNG fallback 128w.
 * Gain typique : ~98% sur le poids (930 KB → 5-15 KB).
 *
 * Lancer :  node scripts/optimize-club-logos.mjs
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC_DIR = path.join(process.cwd(), 'public', 'assets', 'clubs');
const OUT_DIR = SRC_DIR; // overwrite in place

const SIZES = [64, 128, 256]; // largeurs pour srcset (1x, 2x, 3x sur 40-90px)
const PNG_FALLBACK_SIZE = 128; // pour <img> qui n'utilise pas srcset

const TARGETS = ['hco', 'hcp', 'hhs', 'sdhc', 'uspg'];

async function processOne(slug) {
  const src = path.join(SRC_DIR, `${slug}.png`);
  let stat;
  try {
    stat = await fs.stat(src);
  } catch {
    console.warn(`✗ ${slug}: fichier source manquant (${src})`);
    return;
  }
  const sourceSize = (stat.size / 1024).toFixed(1);

  // 1) WebP en 3 tailles → public/assets/clubs/{slug}-{w}.webp
  for (const w of SIZES) {
    const out = path.join(OUT_DIR, `${slug}-${w}.webp`);
    await sharp(src)
      .resize({ width: w, height: w, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85, effort: 5 })
      .toFile(out);
    const s = (await fs.stat(out)).size / 1024;
    console.log(`  ${slug}-${w}.webp → ${s.toFixed(1)} KB`);
  }

  // 2) PNG fallback 128w (transparent) → écrase l'ancien {slug}.png
  const pngOut = path.join(OUT_DIR, `${slug}.png`);
  await sharp(src)
    .resize({ width: PNG_FALLBACK_SIZE, height: PNG_FALLBACK_SIZE, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toFile(pngOut + '.tmp');
  await fs.rename(pngOut + '.tmp', pngOut);
  const pngS = (await fs.stat(pngOut)).size / 1024;
  console.log(`✓ ${slug}: source ${sourceSize} KB → png 128px ${pngS.toFixed(1)} KB + 3 webp`);
}

async function main() {
  console.log(`Optimisation des logos clubs (${TARGETS.length}) ...`);
  for (const slug of TARGETS) {
    await processOne(slug);
  }

  // Synchronise avec /public/lrh-website/assets/clubs/ (chemin legacy utilisé
  // par certains composants — sera retiré quand on aura migré).
  const legacyDir = path.join(process.cwd(), 'public', 'lrh-website', 'assets', 'clubs');
  try {
    await fs.access(legacyDir);
    for (const slug of TARGETS) {
      const src = path.join(SRC_DIR, `${slug}.png`);
      const dst = path.join(legacyDir, `${slug}.png`);
      await fs.copyFile(src, dst);
      for (const w of SIZES) {
        const srcW = path.join(SRC_DIR, `${slug}-${w}.webp`);
        const dstW = path.join(legacyDir, `${slug}-${w}.webp`);
        await fs.copyFile(srcW, dstW);
      }
    }
    console.log('✓ Synchronisé avec public/lrh-website/assets/clubs/');
  } catch {
    console.log('  (public/lrh-website/assets/clubs/ inexistant — skip)');
  }

  console.log('\nTerminé. Pense à committer les nouveaux fichiers.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
