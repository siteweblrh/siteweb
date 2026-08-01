// Résolveur pour `node --test`.
//
// Les sources du projet importent sans extension (`from './fairness'`), ce
// qu'exigent Next et `tsc` en moduleResolution "bundler". Node, lui, veut un
// chemin complet. Plutôt que d'ajouter `.ts` partout dans les sources — que
// tsc refuserait sans `allowImportingTsExtensions`, et qui contaminerait tout
// le projet pour les besoins du test — on complète la résolution ici.
//
// 20 lignes, aucune dépendance, et le code de production reste intact.

import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

registerHooks({
  resolve(specifier, context, nextResolve) {
    // Alias `@/...` du tsconfig.
    let rel = specifier.startsWith('@/')
      ? path.join(ROOT, specifier.slice(2))
      : null;

    if (!rel && specifier.startsWith('.')) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      rel = path.resolve(path.dirname(parent), specifier);
    }

    if (rel && !path.extname(rel)) {
      for (const candidate of [`${rel}.ts`, path.join(rel, 'index.ts')]) {
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
