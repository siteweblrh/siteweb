import * as Sentry from "@sentry/nextjs";

// Config calibrée pour le tier GRATUIT Sentry Developer (5k erreurs + 10k traces / mois).
//
// sendDefaultPii: FALSE — la politique de confidentialité LRH s'engage à ne pas
// transmettre d'IP/headers utilisateur à un tiers ; on conserve uniquement le
// stack trace et les breadcrumbs anonymisés.
//
// tracesSampleRate: 0.1 — 10 % des requêtes serveur tracées, marge confortable
// vs quota 10k/mois (trafic LRH ~2-3k visites/mois).
Sentry.init({
  dsn: "https://419b53064500bc758ebf1bfa514c201b@o4511416045142016.ingest.de.sentry.io/4511416057069648",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? "development",
});
