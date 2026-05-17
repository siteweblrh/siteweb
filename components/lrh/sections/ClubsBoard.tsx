'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import type { ClubsListItem } from '@/lib/queries/club';

function isValidHex(c?: string | null): c is string {
  return typeof c === 'string' && /^#?[0-9a-fA-F]{6}$/.test(c);
}
function normalizeColor(c?: string | null, fallback = LRH.navy): string {
  if (!isValidHex(c)) return fallback;
  return c.startsWith('#') ? c : '#' + c;
}

export function ClubsBoard({
  clubs,
  mobileVariant = false,
}: {
  clubs: ClubsListItem[];
  mobileVariant?: boolean;
}) {
  const standalone = clubs.filter((c) => c.kind === 'STANDALONE');
  const ententes = clubs.filter((c) => c.kind === 'ENTENTE');

  if (clubs.length === 0) {
    return (
      <div
        style={{
          background: LRH.paperWarm,
          padding: mobileVariant ? '48px 16px' : 'clamp(48px, 6.00vw, 80px) clamp(20px, 4.5vw, 64px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.mute,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          [ aucun club enregistré ]
        </div>
        <div
          style={{
            ...body,
            fontSize: 14,
            color: LRH.ink2,
            marginTop: 12,
            maxWidth: 460,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.5,
          }}
        >
          La liste des clubs affiliés à la Ligue Réunionnaise de Hockey sera
          publiée ici dès qu&apos;ils seront enregistrés côté administration.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: LRH.paperWarm, paddingBottom: mobileVariant ? 48 : 80 }}>
      {standalone.length > 0 && (
        <ClubGroup
          kicker={`Clubs affiliés · ${standalone.length}`}
          accent={LRH.red}
          clubs={standalone}
          mobileVariant={mobileVariant}
        />
      )}
      {ententes.length > 0 && (
        <ClubGroup
          kicker={`Ententes · ${ententes.length}`}
          accent={LRH.gold}
          clubs={ententes}
          mobileVariant={mobileVariant}
        />
      )}
    </div>
  );
}

function ClubGroup({
  kicker,
  accent,
  clubs,
  mobileVariant,
}: {
  kicker: string;
  accent: string;
  clubs: ClubsListItem[];
  mobileVariant: boolean;
}) {
  return (
    <div
      style={{
        padding: mobileVariant ? '32px 16px 0' : '48px 64px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <span style={{ width: 22, height: 2, background: accent }} />
        <span
          style={{
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            color: accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {kicker}
        </span>
        <span style={{ flex: 1, height: 1, background: LRH.hair }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant
            ? '1fr'
            : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: mobileVariant ? 14 : 18,
        }}
      >
        {clubs.map((c) => (
          <ClubCard key={c.id} club={c} mobileVariant={mobileVariant} />
        ))}
      </div>
    </div>
  );
}

function ClubCard({
  club,
  mobileVariant,
}: {
  club: ClubsListItem;
  mobileVariant: boolean;
}) {
  const accent = normalizeColor(club.primaryColor);
  const isEntente = club.kind === 'ENTENTE';

  return (
    <Link
      href={`/clubs/${club.slug}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `4px solid ${accent}`,
          padding: mobileVariant ? '18px 18px' : '22px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'relative',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          height: '100%',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            '0 10px 26px rgba(0,34,68,0.10)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {isEntente && (
          <span
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              ...mono,
              fontSize: 9,
              fontWeight: 800,
              padding: '3px 9px',
              background: LRH.gold,
              color: LRH.navy,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            ◆ Entente
          </span>
        )}

        {/* Header : logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {club.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo}
              alt={`${club.name} logo`}
              style={{
                width: 56,
                height: 56,
                objectFit: 'contain',
                background: '#fff',
                padding: 4,
                border: '1px solid ' + LRH.hair,
                flexShrink: 0,
              }}
            />
          ) : (
            <ClubCrest id={club.shortCode ?? undefined} size={56} noLink />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                ...display,
                fontWeight: 700,
                fontSize: mobileVariant ? 17 : 18,
                color: LRH.navy,
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {club.name}
            </div>
            <div
              style={{
                ...mono,
                fontSize: 10,
                color: LRH.mute,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginTop: 4,
                fontWeight: 700,
              }}
            >
              {club.city}
              {club.foundedYear ? ` · Fondé ${club.foundedYear}` : ''}
            </div>
          </div>
        </div>

        {/* Ententes : list parent clubs */}
        {isEntente && club.parentClubs.length > 0 && (
          <div
            style={{
              paddingTop: 10,
              borderTop: '1px dashed ' + LRH.hair,
            }}
          >
            <div
              style={{
                ...mono,
                fontSize: 9,
                fontWeight: 700,
                color: LRH.mute,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              ▸ Clubs constituants · {club.parentClubs.length}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {club.parentClubs.map((p) => (
                <span
                  key={p.id}
                  style={{
                    ...mono,
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: LRH.navy,
                    background: LRH.paperWarm,
                    border: '1px solid ' + LRH.hair,
                    padding: '3px 8px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {p.shortCode ?? p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats footer */}
        <div
          style={{
            display: 'flex',
            gap: 18,
            paddingTop: 12,
            borderTop: '1px dashed ' + LRH.hair,
            marginTop: 'auto',
            alignItems: 'flex-end',
          }}
        >
          <StatCell
            label="Licenciés"
            value={club._count.members}
            color={LRH.navy}
          />
          <StatCell
            label="Compétitions"
            value={club._count.competitionEntries || club._count.standings}
            color={LRH.red}
          />
          <div style={{ flex: 1 }} />
          <span
            style={{
              ...mono,
              fontSize: 14,
              fontWeight: 700,
              color: accent,
            }}
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          ...display,
          fontWeight: 800,
          fontSize: 22,
          color,
          letterSpacing: '-0.035em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...mono,
          fontSize: 8.5,
          color: LRH.mute,
          letterSpacing: '0.18em',
          marginTop: 4,
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}
