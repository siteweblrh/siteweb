import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Skip init complet si DSN non fourni — permet de dev / preview sans
// Sentry sans casser le build.
//
// Config calibrée pour le tier GRATUIT Sentry Developer :
//   - 5 000 erreurs / mois        → 100 % capturées (volume LRH faible)
//   - 10 000 perf traces / mois   → 10 % sampling = ~marge confortable
//   - Session Replay DÉSACTIVÉ    → évite le quota 50/mois trop limité.
//     Les stacks + breadcrumbs suffisent à diagnostiquer 99 % des bugs.
if (dsn) {
  Sentry.init({
    dsn,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    // Filtrer les erreurs sans intérêt (extensions navigateur, scripts tiers
    // non liés à LRH, network errors connus).
    ignoreErrors: [
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Failed to fetch',
    ],

    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  });
}
