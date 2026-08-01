import * as Sentry from "@sentry/nextjs";

import { SERVER_DSN } from "./lib/sentry-dsn";

// Edge runtime (middleware + edge routes). Mêmes contraintes RGPD que le runtime
// serveur, et même règle de silence en dev — voir sentry.server.config.ts.
Sentry.init({
  dsn: SERVER_DSN,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? "development",
});
