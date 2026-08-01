// Initialisation de Sentry côté client — chargement DIFFÉRÉ.
//
// ⚠️ C'EST CE FICHIER QUI FAIT FOI, pas `sentry.client.config.ts`.
// Depuis Next 15 / Sentry SDK v9, `instrumentation-client.ts` remplace
// `sentry.client.config.ts`. Le projet a longtemps eu les deux : une config
// durcie dans `sentry.client.config.ts` (jamais chargée) et le défaut du
// wizard ici. Résultat en prod : Session Replay actif, `tracesSampleRate: 1`
// et `sendDefaultPii: true` alors qu'on croyait le contraire.
// `sentry.client.config.ts` a été supprimé pour que l'ambiguïté ne revienne pas.
//
// ## Pourquoi un import dynamique après `load`
//
// Même sans Replay, `@sentry/nextjs` pèse ~136 Ko compressés — 30 % du JS de
// la home. Mesuré : le LCP mobile simulé descend d'environ 1 s par tranche de
// ~40 Ko de JS retirée du chemin critique, parce que l'image du hero (34 Ko)
// se bat pour la bande passante contre le JS sur le lien slow-4G de PSI.
// Sentry n'a aucune raison d'être dans cette course : on le charge après
// l'événement `load`, quand la page est déjà peinte.
//
// Les erreurs survenant AVANT ce chargement ne sont pas perdues : on installe
// dès maintenant des écouteurs `error` / `unhandledrejection` qui les mettent
// en tampon, puis on les rejoue dans Sentry une fois le SDK prêt.
//
// Config calibrée pour le tier GRATUIT Sentry Developer :
//   - 5 000 erreurs / mois       → 100 % capturées (volume LRH faible)
//   - 10 000 perf traces / mois  → 10 % de sampling, marge confortable
//   - Session Replay DÉSACTIVÉ   → quota 50/mois inexploitable, et son bundle
//     pesait à lui seul 176 Ko compressés sur chaque page publique.

import type * as SentryNS from "@sentry/nextjs";

import { CLIENT_DSN as dsn } from "./lib/sentry-dsn";

/** Erreurs captées avant que le SDK ne soit chargé, rejouées ensuite. */
const buffered: unknown[] = [];
const MAX_BUFFERED = 10;

function bufferError(e: unknown) {
  if (buffered.length < MAX_BUFFERED) buffered.push(e);
}

function onWindowError(ev: ErrorEvent) {
  bufferError(ev.error ?? ev.message);
}
function onRejection(ev: PromiseRejectionEvent) {
  bufferError(ev.reason);
}

let loading: Promise<typeof SentryNS> | null = null;

function loadSentry(): Promise<typeof SentryNS> {
  if (!loading) {
    loading = import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn,
        // Pas de Replay : c'est lui qui tirait les ~176 Ko supplémentaires.
        integrations: [],
        sampleRate: 1.0,
        tracesSampleRate: 0.1,
        // Ne pas envoyer d'informations personnelles (IP, cookies, headers).
        sendDefaultPii: false,
        ignoreErrors: [
          "top.GLOBALS",
          "ResizeObserver loop limit exceeded",
          "Non-Error promise rejection captured",
          "Failed to fetch",
        ],
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      });

      // Rejoue ce qui s'est produit avant l'init, puis rend la main aux
      // handlers natifs du SDK.
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onRejection);
      for (const e of buffered.splice(0)) Sentry.captureException(e);

      return Sentry;
    });
  }
  return loading;
}

if (typeof window !== "undefined") {
  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onRejection);

  const start = () => {
    // `requestIdleCallback` quand dispo : on attend en plus que le thread
    // principal soit calme, pour ne pas rallonger le TBT juste après le paint.
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(() => void loadSentry(), { timeout: 4000 });
    else setTimeout(() => void loadSentry(), 1500);
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

/** Next appelle ce hook à chaque transition de route. Si Sentry n'est pas
 *  encore chargé, la transition n'est pas tracée — c'est acceptable, le
 *  tracing est échantillonné à 10 % de toute façon. */
export const onRouterTransitionStart: typeof SentryNS.captureRouterTransitionStart = (
  ...args
) => {
  if (loading) void loading.then((S) => S.captureRouterTransitionStart?.(...args));
};
