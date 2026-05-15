'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import type { BureauMemberRow } from '@/lib/queries/ligue';

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function Avatar({ photo, fullName, size = 76 }: { photo: string | null; fullName: string; size?: number }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={fullName}
        style={{
          width: size, height: size, borderRadius: 0,
          objectFit: 'cover', flexShrink: 0,
          border: '1px solid ' + LRH.hair,
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: LRH.navy, color: LRH.gold,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      ...display, fontWeight: 800, fontSize: size * 0.36,
      letterSpacing: '-0.02em',
      backgroundImage: 'repeating-linear-gradient(95deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 6px)',
    }}>{getInitials(fullName)}</div>
  );
}

function isPresident(role: string): boolean {
  const r = role.toLowerCase();
  return r.includes('président') && !r.includes('vice');
}

function MemberCard({ m, featured = false, mobileVariant = false }: { m: BureauMemberRow; featured?: boolean; mobileVariant?: boolean }) {
  const accent = featured ? LRH.gold : LRH.navy;
  return (
    <div style={{
      position: 'relative',
      background: '#fff',
      border: '1px solid ' + LRH.hair,
      borderLeft: `3px solid ${accent}`,
      padding: mobileVariant ? '18px 16px' : (featured ? '28px 26px' : '22px 22px'),
      display: 'flex', alignItems: 'flex-start',
      gap: mobileVariant ? 14 : 18,
    }}>
      <Avatar photo={m.photo} fullName={m.fullName} size={mobileVariant ? 56 : featured ? 96 : 72} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {featured && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 8px', borderRadius: 2,
            background: LRH.gold, color: LRH.navy,
            ...mono, fontSize: 9, fontWeight: 800,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>★ Présidence</div>
        )}
        <div style={{
          ...mono, fontSize: 10, fontWeight: 700,
          color: LRH.red, letterSpacing: '0.16em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>{m.role}</div>
        <div style={{
          ...display, fontWeight: 700,
          fontSize: mobileVariant ? 17 : featured ? 24 : 19,
          color: LRH.navy, letterSpacing: '-0.02em', lineHeight: 1.1,
        }}>{m.fullName}</div>
        {m.bio && featured && (
          <p style={{
            ...body, fontSize: 13.5, color: LRH.ink2,
            marginTop: 10, lineHeight: 1.55,
          }}>{m.bio}</p>
        )}
        {(m.email || m.phone || m.startedAt) && (
          <div style={{
            marginTop: 12, paddingTop: 10,
            borderTop: '1px dashed ' + LRH.hairStrong,
            display: 'flex', flexWrap: 'wrap', gap: 14,
            ...mono, fontSize: 10, color: LRH.mute,
            letterSpacing: '0.06em',
          }}>
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                style={{
                  color: LRH.navy, textDecoration: 'none', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '2px 6px', margin: '-2px -6px',
                  borderRadius: 2,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,34,68,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
              >
                <span style={{ color: LRH.red }}>✉</span>
                {m.email}
              </a>
            )}
            {m.phone && (
              <a
                href={`tel:${m.phone.replace(/\s+/g, '')}`}
                style={{
                  color: LRH.navy, textDecoration: 'none', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '2px 6px', margin: '-2px -6px',
                  borderRadius: 2,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(0,34,68,0.06)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
              >
                <span style={{ color: LRH.red }}>☎</span>
                {m.phone}
              </a>
            )}
            {m.startedAt && (
              <span>Depuis {new Date(m.startedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BureauBoard({ members, mobileVariant = false }: { members: BureauMemberRow[]; mobileVariant?: boolean }) {
  const president = members.find((m) => isPresident(m.role));
  const others = president ? members.filter((m) => m.id !== president.id) : members;

  return (
    <div id="bureau" style={{
      background: '#fff',
      padding: mobileVariant ? '40px 16px' : '72px 64px',
      borderTop: '1px solid ' + LRH.hair,
      borderBottom: '1px solid ' + LRH.hair,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: mobileVariant ? 24 : 36, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{
              ...mono, fontSize: 11, fontWeight: 700,
              color: LRH.gold, letterSpacing: '0.22em',
            }}>03</span>
            <span style={{
              ...mono, fontSize: 11, fontWeight: 700,
              color: LRH.mute, letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>Bureau Exécutif</span>
          </div>
          <h2 style={{
            ...display, fontWeight: 700,
            fontSize: mobileVariant ? 30 : 44,
            color: LRH.navy, margin: 0,
            letterSpacing: '-0.035em', lineHeight: 1.05,
          }}>
            Le bureau de la Ligue.
          </h2>
        </div>
        <div style={{
          ...mono, fontSize: 10.5, fontWeight: 700,
          color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>{members.length.toString().padStart(2, '0')} {members.length > 1 ? 'membres' : 'membre'}</div>
      </div>

      {members.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center',
          background: LRH.paper, border: '1px dashed ' + LRH.hairStrong,
        }}>
          <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>Bureau non encore publié.</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: mobileVariant ? '1fr' : 'repeat(2, 1fr)',
          gap: 16,
        }}>
          {president && (
            <div style={{ gridColumn: mobileVariant ? 'auto' : '1 / -1' }}>
              <MemberCard m={president} featured mobileVariant={mobileVariant} />
            </div>
          )}
          {others.map((m) => (
            <MemberCard key={m.id} m={m} mobileVariant={mobileVariant} />
          ))}
        </div>
      )}
    </div>
  );
}
