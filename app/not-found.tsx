import Link from 'next/link';
import { LRH, mono, display, body } from '@/components/lrh/tokens';

export default function NotFound() {
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
        {/* Kicker mono uppercase navy */}
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
          Erreur 404 · Page introuvable
        </div>

        {/* Display number énorme */}
        <div
          style={{
            ...display,
            fontWeight: 800,
            fontSize: 'clamp(80px, 18vw, 180px)',
            lineHeight: 0.9,
            letterSpacing: '-0.05em',
            color: LRH.navy,
            margin: 0,
          }}
        >
          404
        </div>

        {/* Titre */}
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
          Cette page est sortie du terrain.
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
          L&apos;adresse demandée n&apos;existe pas (ou plus). Pas grave —
          voici par où repartir.
        </p>

        {/* Quick links */}
        <div
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: 12,
          }}
        >
          {[
            { href: '/', label: 'Accueil' },
            { href: '/competitions', label: 'Calendrier' },
            { href: '/clubs', label: 'Clubs' },
            { href: '/actualites', label: 'Actualités' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                padding: '14px 16px',
                background: '#fff',
                color: LRH.navy,
                border: '1px solid ' + LRH.hairStrong,
                borderLeft: '3px solid ' + LRH.gold,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                textAlign: 'left',
                transition: 'background 0.15s, transform 0.15s',
              }}
            >
              ▸ {l.label}
            </Link>
          ))}
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
