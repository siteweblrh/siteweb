'use client';

// global-error.tsx s'affiche UNIQUEMENT quand l'erreur se produit dans le
// root layout (avant que app/layout.tsx puisse rendre). C'est une page
// auto-portante : doit inclure <html> et <body>. On n'utilise pas les
// tokens LRH ici parce que les CSS variables (font-poppins, etc.) ne sont
// pas garanties d'être disponibles à ce moment.

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error('[LRH global-error.tsx]', error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#F8F9FA',
          color: '#0B1220',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 520, width: '100%', textAlign: 'left' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#A8202F',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            ▸ Erreur critique
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: '#002244',
              margin: '0 0 12px',
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
          >
            Le site est momentanément indisponible.
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.55 }}>
            Notre équipe est automatiquement notifiée. Merci de rafraîchir la
            page dans quelques instants.
          </p>
          {error.digest && (
            <div
              style={{
                marginTop: 16,
                padding: '8px 12px',
                fontSize: 10,
                fontFamily: 'ui-monospace, monospace',
                color: '#6B7280',
                background: '#fff',
                border: '1px solid rgba(10,18,32,0.14)',
                display: 'inline-block',
                letterSpacing: '0.08em',
              }}
            >
              ID : {error.digest}
            </div>
          )}
          <div style={{ marginTop: 28 }}>
            <a
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 22px',
                background: '#A8202F',
                color: '#fff',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              ◂ Revenir à l&apos;accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
