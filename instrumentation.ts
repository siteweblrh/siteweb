// Next.js instrumentation hook — charge Sentry au démarrage du serveur ou
// du runtime edge. Voir https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
//
// Ce fichier ne fait rien si SENTRY_DSN n'est pas défini (cf. sentry.*.config.ts).

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Capture les erreurs server-side non-attrapées (server actions, etc.).
// Disponible depuis Next 15.
export const onRequestError = async (
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | undefined> },
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: 'render' | 'route' | 'action' | 'middleware'; renderSource?: string; revalidateReason?: string; renderType?: string },
) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(err, request, context);
};
