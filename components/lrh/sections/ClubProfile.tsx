'use client';

import React from 'react';
import { LRH, mono, display, body, ClubCrest } from '../tokens';

export type ClubSponsor = {
  id: string;
  name: string;
  logo?: string | null;
};

export type ClubProfileData = {
  name: string;
  city: string;
  shortCode?: string | null;
  memberCount: number;
  founded?: string | null;
  description?: string | null;
};

export function ClubProfile({
  club,
  sponsors,
  mobileVariant = false,
}: {
  club: ClubProfileData;
  sponsors: ClubSponsor[];
  mobileVariant?: boolean;
}) {
  return (
    <div
      id="presentation"
      style={{
        background: LRH.paper,
        padding: mobileVariant ? '40px 16px 32px' : '72px 64px 48px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : '1.25fr 1fr',
          gap: mobileVariant ? 28 : 56,
          alignItems: 'flex-start',
        }}
      >
        {/* Left — narrative */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ width: 28, height: 2, background: LRH.red }} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.red,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Club · Identité
            </span>
          </div>
          <h2
            style={{
              ...display,
              fontWeight: 700,
              fontSize: mobileVariant ? 30 : 42,
              color: LRH.navy,
              margin: 0,
              letterSpacing: '-0.035em',
              lineHeight: 1.05,
            }}
          >
            {club.name},<br />ancré à {club.city}.
          </h2>
          <p
            style={{
              ...body,
              fontSize: mobileVariant ? 14 : 15.5,
              color: LRH.ink2,
              marginTop: 22,
              lineHeight: 1.65,
              maxWidth: 580,
            }}
          >
            {club.description ||
              `${club.name} défend les couleurs de ${club.city} dans les compétitions officielles de la Ligue Réunionnaise de Hockey. Club affilié à la LRH et à la Fédération Française de Hockey, il engage ses équipes en gazon et/ou en salle selon les saisons.`}
          </p>
          <div style={{ marginTop: 26, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[club.city, 'Affilié LRH', 'Affilié FFH'].map((t) => (
              <span
                key={t}
                style={{
                  ...mono,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '6px 10px',
                  borderRadius: 2,
                  background: '#fff',
                  color: LRH.ink2,
                  border: '1px solid ' + LRH.hairStrong,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — crest hero + key stats */}
        <div
          style={{
            background: LRH.navy,
            color: '#fff',
            padding: mobileVariant ? '24px 20px' : '32px 28px',
            position: 'relative',
            overflow: 'hidden',
            borderTop: '4px solid ' + LRH.gold,
          }}
        >
          {/* Diagonal stripe texture */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 26px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              paddingBottom: 22,
              marginBottom: 22,
              borderBottom: '1px dashed rgba(255,255,255,0.18)',
            }}
          >
            <ClubCrest id={club.shortCode ?? undefined} size={mobileVariant ? 64 : 80} />
            <div>
              <div
                style={{
                  ...mono,
                  fontSize: 10,
                  color: LRH.gold,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {club.shortCode ?? 'Club LRH'}
              </div>
              <div
                style={{
                  ...display,
                  fontWeight: 800,
                  fontSize: mobileVariant ? 20 : 24,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  marginTop: 4,
                  lineHeight: 1.1,
                }}
              >
                {club.name}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ProfileStat label="Licenciés" value={club.memberCount} />
            <ProfileStat label="Ville" value={club.city} small />
          </div>
        </div>
      </div>

      {/* Sponsors strip */}
      {sponsors.length > 0 && (
        <div style={{ marginTop: mobileVariant ? 36 : 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ width: 18, height: 2, background: LRH.gold }} />
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                color: LRH.mute,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              Partenaires
            </span>
            <span style={{ flex: 1, height: 1, background: LRH.hair }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {sponsors.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: '3px solid ' + LRH.gold,
                }}
              >
                {s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.logo}
                    alt={s.name}
                    style={{ height: 22, width: 'auto', objectFit: 'contain' }}
                  />
                ) : (
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      background: LRH.paperWarm,
                      border: '1px solid ' + LRH.hairStrong,
                    }}
                  />
                )}
                <span
                  style={{
                    ...display,
                    fontWeight: 700,
                    fontSize: 13,
                    color: LRH.navy,
                    letterSpacing: '-0.005em',
                  }}
                >
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileStat({
  label,
  value,
  small = false,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          ...display,
          fontWeight: 800,
          fontSize: small ? 18 : 32,
          color: '#fff',
          letterSpacing: '-0.035em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...mono,
          fontSize: 10,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginTop: 8,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}
