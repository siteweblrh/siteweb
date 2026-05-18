'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LRH, body, mono, display, ClubCrest, MODE_COLOR } from '../tokens';
import {
  HeaderDesktop,
  HeaderMobile,
  FooterDesktop,
  MobileTabBar,
  FactsTimeline,
  type FactEvent,
  type Mode,
} from '../sections';
import type { PublicMatch } from '@/lib/queries/match';

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return m;
}

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  SCHEDULED: { label: 'Programmé',  bg: LRH.navy,         fg: '#fff' },
  LIVE:      { label: 'En direct',  bg: LRH.red,          fg: '#fff' },
  HALFTIME:  { label: 'Mi-temps',   bg: '#d97706',        fg: '#fff' },
  FINISHED:  { label: 'Terminé',    bg: LRH.gold,         fg: LRH.navy },
  POSTPONED: { label: 'Reporté',    bg: LRH.mute,         fg: '#fff' },
  CANCELLED: { label: 'Annulé',     bg: LRH.mute,         fg: '#fff' },
};

const PHASE_LABEL: Record<string, string> = {
  REGULAR:     'Phase régulière',
  R32:         '32e de finale',
  R16:         '16e de finale',
  QUARTER:     'Quart de finale',
  SEMI:        'Demi-finale',
  THIRD_PLACE: 'Match pour la 3ᵉ place',
  FINAL:       'Finale',
};

function buildFactEvents(match: PublicMatch): FactEvent[] {
  const events: FactEvent[] = [];
  for (const g of match.goals) {
    events.push({
      id: g.id,
      type: 'GOAL',
      minute: g.minute,
      clubId: g.scoringClubId,
      goalKind: g.kind,
      scorerMember: g.scorerMember,
      scorerName: g.scorerName,
    });
  }
  for (const c of match.cards) {
    events.push({
      id: c.id,
      type: 'CARD',
      minute: c.minute,
      clubId: c.clubId,
      cardKind: c.kind,
      reason: c.reason,
      member: c.member,
      memberName: c.memberName,
    });
  }
  events.sort((a, b) => a.minute - b.minute);
  return events;
}

export function MatchPublicPageClient({ match }: { match: PublicMatch }) {
  const isMobile = useIsMobile();
  // Mode hérité de la compétition — pas de toggle puisqu'on est sur UNE compétition.
  const initialMode: Mode = match.competition.mode === 'GAZON' ? 'gazon' : 'salle';
  const [mode, setMode] = useState<Mode>(initialMode);

  const events = buildFactEvents(match);
  const pal = MODE_COLOR[match.competition.mode];
  const statusInfo = STATUS_LABEL[match.status] ?? STATUS_LABEL.SCHEDULED;

  const kickoff = new Date(match.kickoffAt);
  const dateLabel = kickoff.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeLabel = kickoff.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ background: LRH.paper, ...body, color: LRH.ink, minHeight: '100vh' }}>
      {isMobile ? (
        <HeaderMobile mode={mode} setMode={setMode} />
      ) : (
        <HeaderDesktop mode={mode} setMode={setMode} />
      )}

      {/* Back link */}
      <div style={{ padding: isMobile ? '12px 16px 0' : '14px 64px 0', background: LRH.paper }}>
        <Link
          href="/competitions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: '#fff',
            border: '1px solid ' + LRH.hairStrong,
            color: LRH.navy,
            textDecoration: 'none',
            ...mono,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          <span aria-hidden style={{ fontSize: 12 }}>←</span>
          Compétitions
        </Link>
      </div>

      {/* Hero match — équipes face à face avec score géant */}
      <div
        style={{
          position: 'relative',
          background: LRH.navy,
          color: '#fff',
          padding: isMobile ? '36px 16px 32px' : 'clamp(48px, 5.4vw, 76px) clamp(20px, 4.5vw, 64px) clamp(40px, 4.2vw, 60px)',
          overflow: 'hidden',
          borderBottom: '4px solid ' + LRH.gold,
        }}
      >
        {/* Diagonal stripe + gold spotlight */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(112deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 34px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', top: '-30%', right: '-15%',
            width: 580, height: 580, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,188,28,0.18) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          {/* Kicker compé + journée + statut */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              marginBottom: isMobile ? 18 : 22, flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: pal.bg,
                boxShadow: `0 0 0 4px ${pal.bg}30`,
              }}
            />
            <span style={{
              ...mono, fontSize: isMobile ? 10 : 11,
              color: LRH.gold, fontWeight: 700, letterSpacing: '0.22em',
            }}>
              {match.competition.mode === 'GAZON' ? 'GAZON' : 'SALLE'}
            </span>
            <span style={{
              ...mono, fontSize: isMobile ? 10 : 11,
              color: 'rgba(255,255,255,0.72)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              {match.competition.season} · {match.competition.name}
              {match.matchday != null ? ` · J${String(match.matchday).padStart(2, '0')}` : ''}
              {match.phase !== 'REGULAR' ? ` · ${PHASE_LABEL[match.phase] ?? match.phase}` : ''}
            </span>
            <span
              style={{
                ...mono, fontSize: 10, fontWeight: 800,
                padding: '4px 9px',
                background: statusInfo.bg, color: statusInfo.fg,
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Score face à face */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
              alignItems: 'center',
              gap: isMobile ? 18 : 32,
              marginTop: isMobile ? 12 : 16,
            }}
          >
            <TeamBlock club={match.homeClub} side="home" mobile={isMobile} />
            <ScoreBlock home={match.homeScore} away={match.awayScore} mobile={isMobile} />
            <TeamBlock club={match.awayClub} side="away" mobile={isMobile} />
          </div>

          {/* Metadata strip */}
          <div
            style={{
              display: 'flex',
              gap: isMobile ? 14 : 28,
              flexWrap: 'wrap',
              marginTop: isMobile ? 24 : 34,
              paddingTop: 16,
              borderTop: '1px dashed rgba(255,255,255,0.18)',
            }}
          >
            <MetaCell label="Date" value={`${dateLabel} · ${timeLabel}`} />
            {(match.venueRef || match.venue) && (
              <MetaCell
                label="Terrain"
                value={match.venueRef ? `${match.venueRef.name} · ${match.venueRef.city}` : (match.venue ?? '—')}
              />
            )}
            {match.organizerClub && (
              <MetaCell label="Organisateur" value={match.organizerClub.name} />
            )}
            {match.referees.length > 0 && (
              <MetaCell
                label="Arbitrage"
                value={match.referees
                  .map((r) => `${r.role === 'PRINCIPAL' ? 'Arb.' : 'Dél.'} ${r.referee.fullName}`)
                  .join(' · ')}
              />
            )}
          </div>
        </div>
      </div>

      {/* Faits marquants */}
      <div
        style={{
          padding: isMobile ? '32px 16px' : 'clamp(48px, 5vw, 64px) clamp(20px, 4.5vw, 64px)',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              ...mono, fontSize: 10.5, color: LRH.red,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            01 · Faits marquants
          </div>
          <h2
            style={{
              ...display, fontWeight: 800,
              fontSize: isMobile ? 32 : 44,
              color: LRH.navy, margin: 0,
              letterSpacing: '-0.035em',
              lineHeight: 1,
            }}
          >
            La rencontre minute par minute.
          </h2>
          <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: '10px 0 0', maxWidth: 620 }}>
            Buteurs et cartons enregistrés par la table de marque. Triés par ordre chronologique.
          </p>
        </div>

        <FactsTimeline
          events={events}
          homeClub={match.homeClub}
          awayClub={match.awayClub}
          mobileVariant={isMobile}
        />
      </div>

      {!isMobile && <FooterDesktop />}
      {isMobile && <MobileTabBar />}
    </div>
  );
}

function TeamBlock({
  club,
  side,
  mobile,
}: {
  club: PublicMatch['homeClub'];
  side: 'home' | 'away';
  mobile: boolean;
}) {
  return (
    <Link
      href={`/clubs/${club.slug}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: mobile ? 'row' : 'column',
        alignItems: mobile ? 'center' : (side === 'home' ? 'flex-end' : 'flex-start'),
        gap: mobile ? 14 : 10,
        textAlign: mobile ? 'left' : (side === 'home' ? 'right' : 'left'),
        justifyContent: mobile ? 'flex-start' : undefined,
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.14)',
          padding: mobile ? 8 : 12,
          display: 'inline-flex',
        }}
      >
        {club.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={club.logo}
            alt={`${club.name} logo`}
            style={{
              width: mobile ? 48 : 64,
              height: mobile ? 48 : 64,
              objectFit: 'contain',
            }}
          />
        ) : (
          <ClubCrest id={club.shortCode ?? undefined} size={mobile ? 48 : 64} noLink />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            ...mono, fontSize: 10,
            color: LRH.gold,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {side === 'home' ? 'Domicile' : 'Visiteur'}
        </div>
        <div
          style={{
            ...display, fontWeight: 800,
            fontSize: mobile ? 22 : 28,
            color: '#fff',
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
          }}
        >
          {club.name}
        </div>
        {club.shortCode && (
          <div
            style={{
              ...mono, fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.14em',
              marginTop: 4,
            }}
          >
            {club.shortCode}
          </div>
        )}
      </div>
    </Link>
  );
}

function ScoreBlock({
  home, away, mobile,
}: {
  home: number | null;
  away: number | null;
  mobile: boolean;
}) {
  const has = home != null && away != null;
  return (
    <div
      style={{
        ...display,
        fontWeight: 800,
        fontSize: mobile ? 56 : 84,
        letterSpacing: '-0.05em',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 1,
        padding: mobile ? '0' : '0 20px',
      }}
    >
      {has ? home : '—'}
      <span style={{ color: 'rgba(255,255,255,0.35)', margin: mobile ? '0 14px' : '0 22px' }}>:</span>
      {has ? away : '—'}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          ...mono, fontSize: 9.5, fontWeight: 700,
          color: LRH.gold, letterSpacing: '0.18em',
          textTransform: 'uppercase', marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...body, fontSize: 13,
          color: 'rgba(255,255,255,0.92)',
          textTransform: 'capitalize',
        }}
      >
        {value}
      </div>
    </div>
  );
}
