'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LRH, mono, body, LrhLockup } from '../tokens';
import {
  IconGrid,
  IconHockey,
  IconHandshake,
  IconIdCard,
  IconMegaphone,
  IconInstagram,
  IconFacebook,
  IconYoutube,
  IconTiktok,
} from '../Icons';

type FooterLink = { label: string; href: string };

const FOOTER_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Compétitions',
    links: [
      { label: 'Calendrier', href: '/competitions' },
      { label: 'Classements', href: '/classements' },
      { label: 'Buteurs', href: '/classements' },
    ],
  },
  {
    title: 'Pratiquer',
    links: [
      { label: 'Trouver un club', href: '/clubs' },
      { label: 'Prendre une licence', href: '/licence' },
      { label: 'Devenir arbitre', href: '/arbitrage' },
    ],
  },
  {
    title: 'La Ligue',
    links: [
      { label: 'Bureau', href: '/ligue#bureau' },
      { label: 'Commissions', href: '/ligue#commissions' },
      { label: 'Arbitrage', href: '/arbitrage' },
      { label: 'Actualités', href: '/actualites' },
    ],
  },
];

type FooterData = {
  sponsors: { id: string; name: string; logo: string | null; website: string | null }[];
  social: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  };
  tagline: string;
};

function useFooterData(): FooterData {
  const [data, setData] = useState<FooterData>({
    sponsors: [],
    social: {},
    tagline:
      'La ligue réunionnaise de hockey sur gazon et en salle à La Réunion. Affiliée à la FFH.',
  });
  useEffect(() => {
    let alive = true;
    fetch('/api/footer')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

function SocialIcons({ social }: { social: FooterData['social'] }) {
  const links: { url?: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { url: social.instagram, label: 'Instagram', Icon: IconInstagram },
    { url: social.facebook, label: 'Facebook', Icon: IconFacebook },
    { url: social.youtube, label: 'YouTube', Icon: IconYoutube },
    { url: social.tiktok, label: 'TikTok', Icon: IconTiktok },
  ];
  const visible = links.filter((l) => l.url && l.url.length > 0);
  if (visible.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
      {visible.map(({ url, label, Icon }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`LRH sur ${label}`}
          style={{
            width: 36,
            height: 36,
            background: 'rgba(255,255,255,0.06)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            transition: 'background 0.18s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(243,188,28,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}

function SponsorsStrip({ sponsors }: { sponsors: FooterData['sponsors'] }) {
  if (sponsors.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 36,
        paddingTop: 28,
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10,
          color: LRH.gold,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        ◆ Partenaires officiels
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
        {sponsors.map((s) => {
          const content = s.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logo}
              alt={s.name}
              style={{ height: 36, maxWidth: 140, objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <span
              style={{
                ...mono,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '8px 12px',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              {s.name}
            </span>
          );
          const wrapStyle: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: 0.85,
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'none',
            transition: 'opacity 0.15s ease, transform 0.15s ease',
          };
          return s.website ? (
            <a
              key={s.id}
              href={s.website}
              target="_blank"
              rel="noopener noreferrer sponsored"
              title={`${s.name} — ouvrir le site`}
              style={wrapStyle}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85'; }}
            >{content}</a>
          ) : (
            <div key={s.id} title={s.name} style={wrapStyle}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

export function FooterDesktop() {
  const { sponsors, social, tagline } = useFooterData();
  return (
    <div style={{ background: LRH.navyDeep, color: 'rgba(255,255,255,0.82)', padding: 'clamp(40px, 5vw, 56px) clamp(20px, 4.5vw, 64px) clamp(24px, 3vw, 32px)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) repeat(3, minmax(0, 1fr))',
          gap: 40,
        }}
      >
        <div>
          <LrhLockup height={52} white variant="uni" />
          <p
            style={{
              ...body,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.78)',
              marginTop: 18,
              maxWidth: 320,
              whiteSpace: 'pre-line',
            }}
          >
            {tagline}
          </p>
          <SocialIcons social={social} />
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <div
              style={{
                ...mono,
                fontSize: 10,
                color: LRH.gold,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              {col.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.links.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{
                    ...body,
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.85)',
                    textDecoration: 'none',
                    transition: 'color 0.18s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = LRH.gold)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <SponsorsStrip sponsors={sponsors} />

      <div
        style={{
          marginTop: 36,
          paddingTop: 22,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          ...mono,
          fontSize: 10.5,
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.72)',
        }}
      >
        <div>© {new Date().getFullYear()} LIGUE RÉUNIONNAISE DE HOCKEY</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Link
            href="/mentions-legales"
            style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none', letterSpacing: '0.12em' }}
          >
            MENTIONS LÉGALES
          </Link>
          <Link
            href="/politique-confidentialite"
            style={{ color: 'rgba(255,255,255,0.82)', textDecoration: 'none', letterSpacing: '0.12em' }}
          >
            CONFIDENTIALITÉ
          </Link>
          <Link
            href="/dashboard"
            style={{ color: LRH.gold, textDecoration: 'none', letterSpacing: '0.12em' }}
          >
            ESPACE CLUBS →
          </Link>
        </div>
      </div>
    </div>
  );
}

// La barre tabulaire mobile est orientée visiteur uniquement : pas d'entrée
// « Compte » (réservée aux clubs/arbitres/admins via le burger menu).
// Ordre = parcours visiteur : découvrir → lire → suivre → trouver → s'engager.
const MOBILE_TABS: { label: string; href: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: 'Accueil', href: '/', Icon: IconGrid },
  { label: 'Actu', href: '/actualites', Icon: IconMegaphone },
  { label: 'Matchs', href: '/competitions', Icon: IconHockey },
  { label: 'Clubs', href: '/clubs', Icon: IconHandshake },
  { label: 'Licence', href: '/licence', Icon: IconIdCard },
];

export function MobileTabBar() {
  const pathname = usePathname() ?? '/';

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        background: '#fff',
        borderTop: '1px solid ' + LRH.hair,
        padding: '10px 4px calc(10px + env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-around',
        zIndex: 30,
      }}
    >
      {MOBILE_TABS.map((t) => {
        const isActive =
          t.href === '/' ? pathname === '/' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.label}
            href={t.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              textDecoration: 'none',
              padding: '4px 8px',
              flex: 1,
              maxWidth: 90,
            }}
          >
            <div
              style={{
                color: isActive ? LRH.navy : LRH.mute,
                display: 'inline-flex',
              }}
            >
              <t.Icon size={20} />
            </div>
            <div
              style={{
                ...mono,
                fontSize: 8.5,
                fontWeight: 700,
                color: isActive ? LRH.navy : LRH.mute,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {t.label}
            </div>
            {isActive && (
              <span
                style={{
                  width: 14,
                  height: 2,
                  background: LRH.red,
                  marginTop: -2,
                }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
