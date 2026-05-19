import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Skip init complet si DSN non fourni — permet de dev / preview sans
// Sentry sans casser le build.
if (dsn) {
  Sentry.init({
    dsn,
    // Sample 100 % des erreurs en prod (volume LRH faible), 100 % en dev.
    sampleRate: 1.0,

    // Performance tracing : on garde 10 % pour limiter le quota.
    tracesSampleRate: 0.1,

    // Session replays : précieux pour reproduire les bugs UX. 10 % des
    // sessions normales, 100 % de celles qui contiennent une erreur.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Anonymisation par défaut — pas de capture des inputs ou textes.
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Filtrer les erreurs sans intérêt (extensions navigateur, scripts tiers
    // non liés à LRH, network errors connus).
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // NextAuth client-side cancellations
      'Failed to fetch',
    ],

    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
  });
}
