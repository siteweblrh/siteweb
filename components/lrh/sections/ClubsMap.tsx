'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, clubSrc, CLUBS } from '../tokens';
import {
  getCityCoords,
  ll2xy,
  MAJOR_CITY_LABELS,
  getLabelCoord,
  type MapCoord,
} from '@/lib/reunionCityCoords';
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

// Largeur de référence (desktop) à partir de laquelle les tailles "natives"
// sont définies. En dessous on rétrécit linéairement, au-dessus on plafonne.
const REF_W = 760;

function useContainerWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(REF_W);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setW(cr.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

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
      // Priorité 1 : lat/lon explicites du club (saisis par l'admin).
      // Priorité 2 : lookup par ville (centre commune).
      const coord =
        typeof c.latitude === 'number' && typeof c.longitude === 'number'
          ? ll2xy(c.latitude, c.longitude)
          : getCityCoords(c.city);
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
        padding: mobileVariant
          ? '32px 16px 24px'
          : 'clamp(28px, 4.5vw, 56px) clamp(24px, 5vw, 64px) clamp(20px, 3vw, 32px)',
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
          gridTemplateColumns: mobileVariant
            ? '1fr'
            : 'minmax(0, 1.6fr) minmax(260px, 1fr)',
          gap: mobileVariant ? 18 : 'clamp(18px, 2.2vw, 28px)',
          alignItems: 'start',
        }}
      >
        {/* Map */}
        <MapCanvas clustered={clustered} />

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
                Chaque point représente un club affilié à la Ligue. Survolez
                un marqueur pour voir son nom, cliquez pour ouvrir sa fiche.
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <LegendDot color={LRH.red} label="Club affilié" />
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
            Positions calculées depuis la latitude/longitude réelle de chaque
            commune. Le tracé de l&apos;île est la silhouette officielle.
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

function MapCanvas({
  clustered,
}: {
  clustered: (ClubWithCoord & { offsetX: number; offsetY: number })[];
}) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { ref, width } = useContainerWidth();

  // Scale dérivé de la largeur réelle du conteneur (ResizeObserver).
  // 0.55 = mobile étroit · 1.0 = desktop référence · 1.1 = très large.
  const scale = Math.max(0.55, Math.min(width / REF_W, 1.1));

  const markerSize = Math.round(54 * scale);
  const labelFontSize = +(10 * scale).toFixed(1);
  const labelPadV = Math.max(1, Math.round(2 * scale));
  const labelPadH = Math.max(3, Math.round(5 * scale));
  const dotSize = Math.max(3, Math.round(4 * scale));
  const compassFontSize = +(9 * scale).toFixed(1);

  // Sur les très petits conteneurs (mobile), on garde uniquement les labels
  // "structurants" pour ne pas saturer la carte.
  const COMPACT_THRESHOLD = 420;
  const isCompact = width < COMPACT_THRESHOLD;
  const COMPACT_SLUGS = new Set([
    'saint-denis',
    'saint-andre',
    'saint-benoit',
    'sainte-rose',
    'saint-philippe',
    'saint-joseph',
    'saint-pierre',
    'saint-louis',
    'saint-leu',
    'saint-paul',
    'le-port',
    'cilaos',
  ]);
  const visibleLabels = isCompact
    ? MAJOR_CITY_LABELS.filter((l) => COMPACT_SLUGS.has(l.slug))
    : MAJOR_CITY_LABELS;

  return (
    <div
      ref={ref}
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

      {/* Aspect-ratio container = viewBox SVG */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '14413 / 13405',
        }}
      >
        {/* SVG outline of La Réunion. Le path est rempli #fafafa, ce qui
            ressort très clairement sur le fond navy. */}
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

        {/* City labels — un petit point pour la coord exacte, le label en dessous */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {visibleLabels.map((l) => {
            const c = getLabelCoord(l);
            if (!c) return null;
            return (
              <div
                key={l.slug}
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
                    width: dotSize,
                    height: dotSize,
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
                    padding: `${labelPadV}px ${labelPadH}px`,
                    border: '1px solid rgba(243,188,28,0.32)',
                  }}
                >
                  {l.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Marker overlay */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {clustered.map((c) => {
            const x = c.coord.x + c.offsetX;
            const y = c.coord.y + c.offsetY;
            // Bascule le tooltip sous le marker pour les clubs dans la zone
            // haute (Saint-Denis & Co.) : sinon le tooltip déborde au-dessus
            // du conteneur `overflow: hidden` et est clippé.
            const tooltipBelow = y < 22;
            return (
              <Marker
                key={c.id}
                club={c}
                x={x}
                y={y}
                hovered={hoverId === c.id}
                onHover={(h) => setHoverId(h ? c.id : null)}
                size={markerSize}
                tooltipBelow={tooltipBelow}
              />
            );
          })}
        </div>

        {/* Compass microcopy bottom-left */}
        <div
          style={{
            position: 'absolute',
            left: Math.max(8, Math.round(14 * scale)),
            bottom: Math.max(8, Math.round(14 * scale)),
            ...mono,
            fontSize: compassFontSize,
            fontWeight: 700,
            color: LRH.gold,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.45)',
            padding: `${Math.max(2, Math.round(4 * scale))}px ${Math.max(5, Math.round(9 * scale))}px`,
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
  size,
  tooltipBelow = false,
}: {
  club: ClubsListItem;
  x: number;
  y: number;
  hovered: boolean;
  onHover: (h: boolean) => void;
  size: number;
  /** Si vrai, le tooltip s'affiche sous le marker au lieu de dessus
   *  (utilisé pour les markers proches du bord haut de la carte). */
  tooltipBelow?: boolean;
}) {
  const isEntente = club.kind === 'ENTENTE';
  const accent = isEntente ? LRH.gold : normalizeColor(club.primaryColor, LRH.red);
  const logoSrc = resolveClubLogo(club);
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
          border: `${Math.max(2, Math.round(size * 0.055))}px solid ${accent}`,
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
              fontSize: Math.max(7, Math.round(size * 0.15)),
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

      {/* Tooltip — positionné dynamiquement au-dessus ou en-dessous du marker
          selon sa proximité au bord haut de la carte. */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            ...(tooltipBelow
              ? { top: size + 24 }
              : { bottom: size + 24 }),
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
