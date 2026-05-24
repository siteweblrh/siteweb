import React from 'react';
import { LRH, mono } from '@/components/lrh/tokens';

/**
 * Squelette réutilisable pour les pages publiques (`/competitions`,
 * `/classements`, `/clubs`, `/actualites`, etc.). Reproduit la structure
 * commune : hero navy + bandeau stats + filtres + liste de rows.
 *
 * Utilisé depuis `app/<route>/loading.tsx`. Centralisé pour éviter de
 * dupliquer le CSS shimmer dans chaque fichier `loading.tsx`.
 */
export function PublicPageSkeleton({
  rowCount = 6,
  showStats = true,
  showFilters = true,
}: {
  rowCount?: number;
  showStats?: boolean;
  showFilters?: boolean;
}) {
  return (
    <div style={{ background: LRH.paper, minHeight: '100vh' }}>
      {/* Hero navy skeleton */}
      <div
        style={{
          background: LRH.navy,
          padding: 'clamp(48px, 5.4vw, 76px) clamp(20px, 4.5vw, 64px)',
          borderBottom: `4px solid ${LRH.gold}`,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              ...mono,
              fontSize: 10.5,
              color: LRH.gold,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0.8,
            }}
          >
            ◌ Chargement
          </div>
          <ShimmerBlock height={56} width="60%" tone="dark" />
          <ShimmerBlock height={18} width="40%" tone="dark" />
        </div>
      </div>

      {showStats && (
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid ' + LRH.hair,
            padding: '20px clamp(20px, 4.5vw, 64px)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: 24,
              maxWidth: 1200,
              margin: '0 auto',
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ShimmerBlock height={10} width="50%" />
                <ShimmerBlock height={28} width="80%" />
                <ShimmerBlock height={11} width="60%" />
              </div>
            ))}
          </div>
        </div>
      )}

      {showFilters && (
        <div
          style={{
            padding: '14px clamp(20px, 4.5vw, 64px)',
            background: LRH.paperWarm,
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerBlock key={i} height={32} width={90} />
          ))}
        </div>
      )}

      <div
        style={{
          padding: '24px clamp(20px, 4.5vw, 64px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {Array.from({ length: rowCount }).map((_, i) => (
          <div
            key={i}
            style={{
              background: '#fff',
              border: '1px solid ' + LRH.hair,
              borderLeft: `3px solid ${LRH.hairStrong}`,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
            }}
          >
            <ShimmerBlock height={44} width={56} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ShimmerBlock height={14} width="70%" />
              <ShimmerBlock height={11} width="40%" />
            </div>
            <ShimmerBlock height={28} width={70} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes lrh-pub-shimmer {
          0% { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
        .lrh-pub-shimmer {
          background: linear-gradient(
            90deg,
            ${LRH.hairStrong} 0%,
            ${LRH.hair} 40%,
            ${LRH.hairStrong} 80%
          );
          background-size: 220% 100%;
          animation: lrh-pub-shimmer 1.4s linear infinite;
          border-radius: 3px;
        }
        .lrh-pub-shimmer.dark {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.05) 0%,
            rgba(255,255,255,0.12) 40%,
            rgba(255,255,255,0.05) 80%
          );
          background-size: 220% 100%;
          animation: lrh-pub-shimmer 1.4s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .lrh-pub-shimmer, .lrh-pub-shimmer.dark { animation: none; }
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
      className={tone === 'dark' ? 'lrh-pub-shimmer dark' : 'lrh-pub-shimmer'}
      style={{ height, width, flexShrink: 0 }}
      aria-hidden="true"
    />
  );
}
