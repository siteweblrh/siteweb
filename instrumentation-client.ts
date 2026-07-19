// Initialisation de Sentry côté client.
//
// ⚠️ C'EST CE FICHIER QUI FAIT FOI, pas `sentry.client.config.ts`.
// Depuis Next 15 / Sentry SDK v9, `instrumentation-client.ts` remplace
// `sentry.client.config.ts`. Le projet a longtemps eu les deux : une config
// durcie dans `sentry.client.config.ts` (jamais chargée) et le défaut du
// wizard ici. Résultat en prod : Session Replay actif, `tracesSampleRate: 1`
// et `sendDefaultPii: true` alors qu'on croyait le contraire.
// `sentry.client.config.ts` a été supprimé pour que l'ambiguïté ne revienne pas.
//
// Config calibrée pour le tier GRATUIT Sentry Developer :
//   - 5 000 erreurs / mois       → 100 % capturées (volume LRH faible)
//   - 10 000 perf traces / mois  → 10 % de sampling, marge confortable
//   - Session Replay DÉSACTIVÉ   → quota 50/mois inexploitable, et surtout
//     le bundle Replay pesait 176 Ko compressés sur CHAQUE page publique,
//     soit le plus gros poste JS du site. Les stacks + breadcrumbs suffisent
//     à diagnostiquer l'essentiel.

import * as Sentry from "@sentry/nextjs";

// DSN par env si fourni, sinon la valeur du projet (garde Sentry fonctionnel
// en prod même si la variable n'est pas posée sur Vercel).
const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN ??
  "https://419b53064500bc758ebf1bfa514c201b@o4511416045142016.ingest.de.sentry.io/4511416057069648";

Sentry.init({
  dsn,

  // Pas d'intégration Replay : c'est elle qui tirait les ~176 Ko.
  integrations: [],

  sampleRate: 1.0,
  tracesSampleRate: 0.1,

  // Ne pas envoyer d'informations personnelles (IP, cookies, headers).
  sendDefaultPii: false,

  // Bruit sans valeur diagnostique : extensions navigateur, scripts tiers.
  ignoreErrors: [
    "top.GLOBALS",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "Failed to fetch",
  ],

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
