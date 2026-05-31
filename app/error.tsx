'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';
import { LRH, mono, display, body } from '@/components/lrh/tokens';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture explicite vers Sentry (en plus du auto-capture).
    Sentry.captureException(error);
    // Garde un trace lisible dans les Runtime Logs Vercel.
    console.error('[LRH error.tsx]', error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: LRH.paper,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 64px)',
      }}
    >
      <div style={{ maxWidth: 640, width: '100%' }}>
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ width: 28, height: 2, background: LRH.red }} />
          Erreur · Quelque chose a buggé
        </div>

        <div
          style={{
            ...display,
            fontWeight: 800,
            fontSize: 'clamp(72px, 16vw, 160px)',
            lineHeight: 0.9,
            letterSpacing: '-0.05em',
            color: LRH.navy,
          }}
        >
          ⚠
        </div>

        <h1
          style={{
            ...display,
            fontWeight: 700,
            fontSize: 'clamp(22px, 4vw, 32px)',
            color: LRH.navy,
            margin: '12px 0 0',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
          }}
        >
          Coup d&apos;arrêt côté serveur.
        </h1>

        <p
          style={{
            ...body,
            fontSize: 14,
            color: LRH.mute,
            margin: '14px 0 0',
            lineHeight: 1.55,
            maxWidth: 480,
          }}
        >
          Une erreur inattendue s&apos;est produite. L&apos;équipe technique est
          notifiée automatiquement. Tu peux réessayer ou revenir à
          l&apos;accueil.
        </p>

        {error.digest && (
          <div
            style={{
              marginTop: 14,
              padding: '8px 12px',
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.1em',
              background: '#fff',
              border: '1px solid ' + LRH.hair,
              borderLeft: '3px solid ' + LRH.mute,
              display: 'inline-block',
            }}
          >
            ID erreur : {error.digest}
          </div>
        )}

        <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              padding: '14px 22px',
              background: LRH.red,
              color: '#fff',
              border: 'none',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            ↻ Réessayer
          </button>
          <Link
            href="/"
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              padding: '14px 22px',
              background: 'transparent',
              color: LRH.navy,
              border: '1px solid ' + LRH.navy,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            ◂ Accueil
          </Link>
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 20,
            borderTop: '1px dashed ' + LRH.hairStrong,
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          ◉ Ligue Réunionnaise de Hockey
        </div>
      </div>
    </main>
  );
}
