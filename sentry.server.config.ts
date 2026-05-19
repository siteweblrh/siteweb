import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sampleRate: 1.0,
    tracesSampleRate: 0.1,

    // Tronquer les IPs côté serveur — RGPD-friendly.
    sendDefaultPii: false,

    environment: process.env.VERCEL_ENV ?? 'development',
  });
}
