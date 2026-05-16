'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, clubSrc, CLUBS } from '../tokens';
import { getCityCoords, type MapCoord } from '@/lib/reunionCityCoords';
import type { ClubsListItem } from '@/lib/queries/club';

// Pour chaque club, déterminer la meilleure source de logo à afficher sur la
// carte : 1) photo Cloudflare uploadée, 2) PNG livré dans public/lrh-website/
// pour les clubs connus (HCO/HCP/HHS/SDHC/USPG), 3) null → fallback initiales.
function resolveClubLogo(club: ClubsListItem): string | null {
  if (club.logo) return club.logo;
  if (club.shortCode && club.shortCode in CLUBS) {
    const src = clubSrc(club.shortCode);
    if (src) return src;
  }
  return null;
}

function isValidHex(c?: string | null): c is string {
  return typeof c === 'string' && /^#?[0-9a-fA-F]{6}$/.test(c);
}
function normalizeColor(c?: string | null, fallback = LRH.navy): string {
  if (!isValidHex(c)) return fallback;
  return c.startsWith('#') ? c : '#' + c;
}

type ClubWithCoord = ClubsListItem & { coord: MapCoord };

export function ClubsMap({
  clubs,
  mobileVariant = false,
}: {
  clubs: ClubsListItem[];
  mobileVariant?: boolean;
}) {
  const { mapped, unmapped } = useMemo(() => {
    const m: ClubWithCoord[] = [];
    const u: ClubsListItem[] = [];
    for (const c of clubs) {
      const coord = getCityCoords(c.city);
      if (coord) m.push({ ...c, coord });
      else u.push(c);
    }
    return { mapped: m, unmapped: u };
  }, [clubs]);

  // Petit cluster offset si plusieurs clubs partagent la même ville.
  const clustered = useMemo(() => {
    const byKey = new Map<string, ClubWithCoord[]>();
    for (const c of mapped) {
      const key = `${c.coord.x.toFixed(1)}-${c.coord.y.toFixed(1)}`;
      const arr = byKey.get(key) ?? [];
      arr.push(c);
      byKey.set(key, arr);
    }
    const positioned: (ClubWithCoord & { offsetX: number; offsetY: number })[] = [];
    for (const arr of byKey.values()) {
      if (arr.length === 1) {
        positioned.push({ ...arr[0], offsetX: 0, offsetY: 0 });
      } else {
        // Disperse en cercle autour du point central
        const radius = 4.5; // % du viewBox
        arr.forEach((c, i) => {
          const angle = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
          positioned.push({
            ...c,
            offsetX: Math.cos(angle) * radius,
            offsetY: Math.sin(angle) * radius,
          });
        });
      }
    }
    return positioned;
  }, [mapped]);

  if (mapped.length === 0 && unmapped.length === 0) return null;

  return (
    <div
      style={{
        background: LRH.paper,
        padding: mobileVariant ? '32px 16px 24px' : '56px 64px 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ width: 28, height: 2, background: LRH.gold }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: LRH.gold,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          ◉ Le hockey sur l&apos;île
        </span>
        <span style={{ flex: 1, height: 1, background: LRH.hair }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : 'minmax(0, 1.6fr) minmax(280px, 1fr)',
          gap: mobileVariant ? 18 : 28,
          alignItems: 'start',
        }}
      >
        {/* Map */}
        <MapCanvas clustered={clustered} mobileVariant={mobileVariant} />

        {/* Side panel : legend + list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              background: LRH.navy,
              color: '#fff',
              padding: '18px 20px',
              border: '1px solid ' + LRH.hair,
              borderLeft: '4px solid ' + LRH.gold,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 26px)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  ...mono,
                  fontSize: 10,
                  fontWeight: 800,
                  color: LRH.gold,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                }}
              >
                Lecture de la carte
              </div>
              <div
                style={{
                  ...body,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.82)',
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                Chaque point représente un club ou une entente. Survolez un
                marqueur pour voir son nom, cliquez pour ouvrir sa fiche.
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <LegendDot color={LRH.red} label="Club affilié" />
                <LegendDot color={LRH.gold} label="Entente inter-clubs" />
              </div>
              <div
                style={{
                  ...mono,
                  fontSize: 9.5,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginTop: 14,
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                Le logo du club est encerclé de sa couleur principale.
              </div>
            </div>
          </div>

          {unmapped.length > 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid ' + LRH.hair,
                borderLeft: '3px solid ' + LRH.hairStrong,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  ...mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: LRH.mute,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Hors carte · {unmapped.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unmapped.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.slug}`}
                    style={{
                      ...body,
                      fontSize: 13,
                      color: LRH.navy,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    {c.name}{' '}
                    <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.06em' }}>
                      · {c.city}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              ...mono,
              fontSize: 9.5,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              fontWeight: 700,
              lineHeight: 1.6,
            }}
          >
            Positions approximatives basées sur la commune du club. Le tracé
            de l&apos;île reste indicatif.
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          border: `3px solid ${color}`,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          ...mono,
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Étiquettes de communes affichées sur la carte. Coords alignées avec
// `lib/reunionCityCoords.ts` (basé sur les lat/long réelles).
// Sert à la fois de repère géographique et de vérification visuelle des
// positions des markers clubs.
const CITY_LABELS: { label: string; x: number; y: number }[] = [
  { label: 'Saint-Denis', x: 39, y: 9 },
  { label: 'Sainte-Marie', x: 50, y: 11 },
  { label: 'Saint-André', x: 66, y: 20 },
  { label: 'Saint-Benoît', x: 77, y: 33 },
  { label: 'Sainte-Rose', x: 73, y: 49 },
  { label: 'Saint-Philippe', x: 65, y: 84 },
  { label: 'Saint-Joseph', x: 56, y: 90 },
  { label: 'Saint-Pierre', x: 39, y: 86 },
  { label: 'Le Tampon', x: 43, y: 73 },
  { label: 'Saint-Louis', x: 31, y: 80 },
  { label: 'Saint-Leu', x: 17, y: 56 },
  { label: 'Saint-Paul', x: 19, y: 26 },
  { label: 'La Possession', x: 23, y: 18 },
  { label: 'Le Port', x: 19, y: 16 },
  { label: 'Cilaos', x: 35, y: 56 },
  { label: 'Salazie', x: 49, y: 33 },
];

function MapCanvas({
  clustered,
  mobileVariant,
}: {
  clustered: (ClubWithCoord & { offsetX: number; offsetY: number })[];
  mobileVariant: boolean;
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const labelFontSize = mobileVariant ? 8 : 10;

  return (
    <div
      style={{
        position: 'relative',
        background: LRH.navy,
        border: '1px solid ' + LRH.hair,
        borderTop: '4px solid ' + LRH.gold,
        overflow: 'hidden',
      }}
    >
      {/* Diagonal stripe pattern over the navy bg (LRH signature) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 30px)',
          pointerEvents: 'none',
        }}
      />
      {/* Gold spotlight top-right (LRH signature) */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          right: '-10%',
          width: '60%',
          height: '60%',
          background:
            'radial-gradient(circle, rgba(243,188,28,0.16) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Aspect-ratio container 14413:13405 ≈ 1.075 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '14413 / 13405',
        }}
      >
        {/* SVG outline of La Réunion. Le path est rempli #fafafa, ce qui
            ressort très clairement sur le fond navy — pas besoin de tinter. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/La-Reunion-974-carte.svg"
          alt="Carte de La Réunion (974)"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))',
            pointerEvents: 'none',
          }}
        />

        {/* City labels — visibles, avec un petit point qui marque la coord exacte */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {CITY_LABELS.map((c) => (
            <div
              key={c.label}
              style={{
                position: 'absolute',
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  background: LRH.gold,
                  borderRadius: '50%',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.4)',
                }}
              />
              <span
                style={{
                  ...mono,
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textShadow:
                    '0 1px 0 rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)',
                  whiteSpace: 'nowrap',
                  background: 'rgba(0,34,68,0.55)',
                  padding: '1px 5px',
                  border: '1px solid rgba(243,188,28,0.32)',
                }}
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>

        {/* Marker overlay */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {clustered.map((c) => {
            const x = c.coord.x + c.offsetX;
            const y = c.coord.y + c.offsetY;
            return (
              <Marker
                key={c.id}
                club={c}
                x={x}
                y={y}
                hovered={hoverId === c.id}
                onHover={(h) => setHoverId(h ? c.id : null)}
                mobileVariant={mobileVariant}
              />
            );
          })}
        </div>

        {/* Compass microcopy bottom-left */}
        <div
          style={{
            position: 'absolute',
            left: 14,
            bottom: 14,
            ...mono,
            fontSize: 9,
            fontWeight: 700,
            color: LRH.gold,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.45)',
            padding: '4px 9px',
            border: '1px solid rgba(243,188,28,0.32)',
            zIndex: 1,
          }}
        >
          N ↑ · LRH · 974
        </div>
      </div>
    </div>
  );
}

function Marker({
  club,
  x,
  y,
  hovered,
  onHover,
  mobileVariant,
}: {
  club: ClubsListItem;
  x: number;
  y: number;
  hovered: boolean;
  onHover: (h: boolean) => void;
  mobileVariant: boolean;
}) {
  const isEntente = club.kind === 'ENTENTE';
  const accent = isEntente ? LRH.gold : normalizeColor(club.primaryColor, LRH.red);
  const logoSrc = resolveClubLogo(club);
  const size = mobileVariant ? 42 : 54;
  const initials = (club.shortCode ?? club.name).slice(0, 3).toUpperCase();

  return (
    <Link
      href={`/clubs/${club.slug}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        textDecoration: 'none',
        zIndex: hovered ? 5 : 2,
        cursor: 'pointer',
      }}
      aria-label={`Voir le club ${club.name}`}
    >
      {/* Pulse halo (uses accent color) */}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: size + 18,
          height: size + 18,
          borderRadius: '50%',
          background: accent,
          opacity: hovered ? 0.32 : 0.16,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}
      />

      {/* Logo medallion */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#fff',
          border: `3px solid ${accent}`,
          boxShadow: hovered
            ? '0 10px 22px rgba(0,0,0,0.30), 0 0 0 3px rgba(255,255,255,0.55)'
            : '0 4px 10px rgba(0,0,0,0.22)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          transform: hovered ? 'scale(1.12)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={`${club.name} logo`}
            style={{
              width: '78%',
              height: '78%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        ) : (
          <span
            style={{
              ...display,
              fontWeight: 800,
              fontSize: size * 0.34,
              color: accent,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {initials}
          </span>
        )}

        {/* Entente badge corner */}
        {isEntente && (
          <span
            style={{
              position: 'absolute',
              right: -2,
              top: -2,
              background: LRH.gold,
              color: LRH.navy,
              ...mono,
              fontSize: 8,
              fontWeight: 800,
              padding: '2px 4px',
              letterSpacing: '0.04em',
              border: '2px solid #fff',
              lineHeight: 1,
            }}
          >
            ◆
          </span>
        )}
      </div>

      {/* Stick to anchor visually at the city point */}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '100%',
          transform: 'translate(-50%, -1px)',
          width: 2,
          height: 8,
          background: accent,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: '100%',
          transform: 'translate(-50%, 7px)',
          width: 6,
          height: 6,
          background: accent,
          borderRadius: '50%',
          border: '1px solid #fff',
          pointerEvents: 'none',
        }}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: size + 24,
            transform: 'translateX(-50%)',
            background: LRH.navy,
            color: '#fff',
            padding: '10px 14px',
            border: '1px solid ' + accent,
            borderLeft: `3px solid ${accent}`,
            whiteSpace: 'nowrap',
            zIndex: 6,
            pointerEvents: 'none',
            boxShadow: '0 10px 26px rgba(0,0,0,0.30)',
          }}
        >
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 14,
              color: '#fff',
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
            }}
          >
            {club.name}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 9.5,
              color: LRH.gold,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginTop: 3,
              fontWeight: 700,
            }}
          >
            {club.city}
            {isEntente && (
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                {' · '}◆ Entente
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
