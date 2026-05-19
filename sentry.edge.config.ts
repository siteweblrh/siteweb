import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware + edge routes). Mêmes contraintes RGPD que le runtime
// serveur — voir sentry.server.config.ts.
Sentry.init({
  dsn: "https://419b53064500bc758ebf1bfa514c201b@o4511416045142016.ingest.de.sentry.io/4511416057069648",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? "development",
});
