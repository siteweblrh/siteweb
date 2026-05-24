import React from 'react';
import { LRH, mono, display } from '@/components/lrh/tokens';

/**
 * Skeleton servi instantanément à la navigation vers n'importe quelle page
 * `/dashboard/*` pendant que le server component se résout (auth + queries).
 *
 * Sans ce fichier, Next.js gardait la page précédente affichée et bloquée
 * jusqu'à la résolution complète du nouveau render (~400-800ms sur Neon
 * serverless). Avec, l'utilisateur a un feedback visuel immédiat.
 *
 * Le squelette reproduit grossièrement la structure d'une page dashboard :
 * sidebar + en-tête + bloc de contenu, avec un shimmer subtil pour signaler
 * que c'est un état transitoire (pas un écran vide).
 */
export default function DashboardLoading() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        background: LRH.paper,
        fontFamily: 'inherit',
      }}
    >
      {/* Sidebar skeleton (hidden < 1024px pour matcher le vrai layout) */}
      <aside
        className="dash-loading-sidebar"
        style={{
          width: 280,
          background: LRH.navy,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '24px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          flexShrink: 0,
        }}
      >
        <ShimmerBlock height={56} width="60%" tone="dark" />
        <div style={{ height: 24 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock key={i} height={34} width="100%" tone="dark" />
        ))}
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: 'clamp(16px, 3vw, 32px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.red,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              opacity: 0.75,
            }}
          >
            ◌ Chargement
          </div>
          <ShimmerBlock height={36} width="55%" />
          <ShimmerBlock height={14} width="42%" />
          <div style={{ height: 8 }} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: 14,
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: `3px solid ${LRH.hairStrong}`,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <ShimmerBlock height={12} width="40%" />
                <ShimmerBlock height={22} width="80%" />
                <ShimmerBlock height={12} width="60%" />
              </div>
            ))}
          </div>
          <div style={{ height: 8 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid ' + LRH.hair,
                borderLeft: `3px solid ${LRH.hairStrong}`,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <ShimmerBlock height={40} width={40} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ShimmerBlock height={14} width="55%" />
                <ShimmerBlock height={11} width="35%" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes lrh-shimmer {
          0% { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
        .lrh-shimmer {
          background: linear-gradient(
            90deg,
            ${LRH.hairStrong} 0%,
            ${LRH.hair} 40%,
            ${LRH.hairStrong} 80%
          );
          background-size: 220% 100%;
          animation: lrh-shimmer 1.4s linear infinite;
          border-radius: 3px;
        }
        .lrh-shimmer.dark {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.10) 40%,
            rgba(255,255,255,0.04) 80%
          );
          background-size: 220% 100%;
          animation: lrh-shimmer 1.4s linear infinite;
        }
        @media (max-width: 1023.98px) {
          .dash-loading-sidebar { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lrh-shimmer, .lrh-shimmer.dark { animation: none; }
        }
      `}</style>
    </div>
  );
}

function ShimmerBlock({
  height,
  width,
  tone = 'light',
}: {
  height: number;
  width: number | string;
  tone?: 'light' | 'dark';
}) {
  return (
    <div
      className={tone === 'dark' ? 'lrh-shimmer dark' : 'lrh-shimmer'}
      style={{ height, width, flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}
