// Source unique du DSN Sentry, sans effet de bord — importable par les trois
// configs (server / edge / client) sans déclencher d'init croisée.
//
// Silence en développement : le tier gratuit (5 000 erreurs/mois) n'a pas à être
// consommé par des erreurs de `next dev`. Un DSN vide désactive le SDK.
// Surchargeable si on veut malgré tout tracer une session locale.
//
// En production NODE_ENV vaut "production" (Vercel comme `next build`), donc le
// DSN par défaut s'applique : comportement de la prod inchangé.

const DEFAULT_DSN =
  "https://419b53064500bc758ebf1bfa514c201b@o4511416045142016.ingest.de.sentry.io/4511416057069648";

const isDev = process.env.NODE_ENV === "development";

/** DSN pour les runtimes serveur et edge. Surcharge : `SENTRY_DSN`. */
export const SERVER_DSN = process.env.SENTRY_DSN ?? (isDev ? "" : DEFAULT_DSN);

/** DSN pour le runtime client. Surcharge : `NEXT_PUBLIC_SENTRY_DSN`. */
export const CLIENT_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN ?? (isDev ? "" : DEFAULT_DSN);
