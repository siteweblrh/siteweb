'use client';

import React from 'react';
import Link from 'next/link';
import {
  LRH, mono, display, body,
  ClubCrest, ImageSlot, Card, CardHeader, CardHeaderDark, Stat,
} from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { SectionHeading, MobileSectionLabel, MobileSectionTitle } from './SectionHeading';
import type { Mode } from './Header';

type LastResult = ModeData['lastResult'];
type StandingsTop = ModeData['standingsTop'];
type PlayerOfMonth = ModeData['playerOfMonth'];

export function LastResultCard({ mode, match, compact = false }: {
  mode: Mode;
  match: LastResult;
  compact?: boolean;
}) {
  if (!match) {
    return (
      <Card>
        <CardHeader kicker="Dernier résultat" meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'} />
        <p style={{ ...body, fontSize: 13, color: LRH.mute, marginTop: 20 }}>Aucun résultat à afficher.</p>
      </Card>
    );
  }

  const home = match.homeClub;
  const away = match.awayClub;
  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;
  const matchDuration = mode === 'gazon' ? 90 : 80;

  if (compact) {
    return (
      <Card>
        <CardHeader kicker="Dernier résultat" meta={match.matchday ? `J${match.matchday}` : ''} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <ClubCrest id={home.shortCode ?? undefined} size={40} />
          <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>{home.name}</div>
          <div style={{ ...display, fontWeight: 800, fontSize: 30, color: hs > as ? LRH.navy : LRH.mute, letterSpacing: '-0.03em' }}>{hs}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <ClubCrest id={away.shortCode ?? undefined} size={40} />
          <div style={{ flex: 1, ...display, fontWeight: 700, fontSize: 14, color: LRH.navy }}>{away.name}</div>
          <div style={{ ...display, fontWeight: 800, fontSize: 30, color: as > hs ? LRH.red : LRH.mute, letterSpacing: '-0.03em' }}>{as}</div>
        </div>
        {match.sponsor && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed ' + LRH.hairStrong, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Présenté par</span>
            <div style={{ padding: '3px 8px', borderRadius: 3, background: LRH.navy, color: LRH.gold, ...display, fontWeight: 800, fontSize: 10 }}>{match.sponsor.name.toUpperCase()}</div>
          </div>
        )}
        <Link
          href={`/match/${match.id}`}
          style={{
            ...mono, fontSize: 10, fontWeight: 700,
            color: LRH.navy, letterSpacing: '0.14em',
            textTransform: 'uppercase', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 12,
          }}
        >
          Détails du match ▸
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        kicker="Dernier résultat"
        meta={`${match.matchday ? `J${match.matchday}` : ''}${match.venue ? ` · ${match.venue.split('·')[0].trim()}` : ''}`}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.4vw, 20px)', marginTop: 28 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1vw, 14px)' }}>
          <ClubCrest id={home.shortCode ?? undefined} size={48} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...display, fontWeight: 700, fontSize: 'clamp(13px, 1.3vw, 18px)', color: LRH.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{home.name}</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>Domicile</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(6px, 1vw, 14px)', ...display, fontWeight: 800, fontSize: 'clamp(34px, 4.5vw, 64px)', letterSpacing: '-0.04em', color: LRH.navy, lineHeight: 1, flexShrink: 0 }}>
          <span style={{ color: hs > as ? LRH.navy : LRH.mute }}>{hs}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: LRH.mute, ...mono, letterSpacing: '0.06em' }}>—</span>
          <span style={{ color: as > hs ? LRH.red : LRH.mute }}>{as}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'clamp(8px, 1vw, 14px)', flexDirection: 'row-reverse', textAlign: 'right' }}>
          <ClubCrest id={away.shortCode ?? undefined} size={48} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...display, fontWeight: 700, fontSize: 'clamp(13px, 1.3vw, 18px)', color: LRH.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{away.name}</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>Visiteur</div>
          </div>
        </div>
      </div>

      {match.goals.length > 0 && (
        <div style={{ marginTop: 28, padding: '14px 16px', background: LRH.paperWarm, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>0'</span>
          <div style={{ flex: 1, height: 6, background: '#fff', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
            {match.goals.map((g, i) => (
              <div key={i} title={`${g.minute}' ${g.scorerName ?? ''}`} style={{
                position: 'absolute', left: (g.minute / matchDuration * 100) + '%', top: -2,
                width: 3, height: 10, background: g.scoringClubId === home.id ? LRH.navy : LRH.red,
              }} />
            ))}
          </div>
          <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>{matchDuration}'</span>
        </div>
      )}

      {match.sponsor && (
        <div style={{
          marginTop: 16, paddingTop: 14, borderTop: '1px dashed ' + LRH.hairStrong,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Présenté par
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              padding: '4px 10px', borderRadius: 4, background: LRH.navy, color: LRH.gold,
              ...display, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em',
            }}>{match.sponsor.name.toUpperCase()}</div>
          </div>
        </div>
      )}
      <Link
        href={`/match/${match.id}`}
        style={{
          ...mono, fontSize: 11, fontWeight: 700,
          color: LRH.navy, letterSpacing: '0.14em',
          textTransform: 'uppercase', textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 14,
          padding: '8px 14px',
          background: LRH.paperWarm,
          border: '1px solid ' + LRH.hairStrong,
        }}
      >
        Détails du match ▸
      </Link>
    </Card>
  );
}

export function StandingsTopCard({ mode, standingsTop, compact = false }: {
  mode: Mode;
  standingsTop: StandingsTop;
  compact?: boolean;
}) {
  return (
    <Card dark>
      <CardHeaderDark
        kicker={compact ? 'Top 3' : 'Top 3 Classement'}
        meta={mode === 'gazon' ? 'D1 GAZON' : 'D1 SALLE'}
      />
      <div style={{ marginTop: compact ? 16 : 22, display: 'flex', flexDirection: 'column', gap: compact ? 12 : 14 }}>
        {standingsTop.length === 0 ? (
          <div style={{ ...body, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Aucun classement.</div>
        ) : standingsTop.map((s) => {
          const gd = s.goalsFor - s.goalsAgainst;
          const gdLabel = (gd > 0 ? '+' : '') + gd;
          return (
            <div key={s.club.id} style={{ display: 'flex', alignItems: 'center', gap: compact ? 12 : 14 }}>
              <div style={{
                ...display, fontWeight: 800,
                fontSize: compact ? 20 : 28,
                color: s.rank === 1 ? LRH.gold : (compact ? '#fff' : 'rgba(255,255,255,0.85)'),
                minWidth: compact ? 24 : 30, letterSpacing: '-0.03em',
              }}>{s.rank.toString().padStart(2, '0')}</div>
              <ClubCrest id={s.club.shortCode ?? undefined} size={compact ? 30 : 36} />
              <div style={{ flex: 1, ...display, fontWeight: 600, fontSize: compact ? 13 : 14 }}>{s.club.name}</div>
              {compact ? (
                <div style={{ ...display, fontWeight: 700, fontSize: 16 }}>{s.points}</div>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...display, fontWeight: 700, fontSize: 18 }}>{s.points}</div>
                  <div style={{ ...mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>{gdLabel}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function PlayerOfMonthCard({ playerOfMonth, compact = false }: {
  playerOfMonth: PlayerOfMonth;
  compact?: boolean;
}) {
  if (!playerOfMonth) {
    return (
      <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', height: compact ? 160 : 220 }}>
          <ImageSlot label="Joueur du mois — à nommer" height={compact ? 160 : 220} tone="navy" radius={0} />
          <div style={{
            position: 'absolute', top: 16, right: 16,
            padding: '6px 10px', borderRadius: 4,
            background: LRH.gold, color: LRH.navy,
            ...display, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em',
          }}>★ MVP</div>
        </div>
        <div style={{ padding: compact ? 16 : 22, flex: 1 }}>
          <div style={{ ...mono, fontSize: 10.5, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
            Joueur du mois
          </div>
          <p style={{ ...body, fontSize: 13, color: LRH.mute, marginTop: 10 }}>
            Aucun joueur nommé pour le moment.
          </p>
        </div>
      </Card>
    );
  }

  const { member } = playerOfMonth;
  const photo = playerOfMonth.photo ?? member.photo ?? null;
  const fullName = `${member.firstName} ${member.lastName}`;
  const subtitleParts = [
    member.club?.name ?? null,
    member.jerseyNumber != null ? `#${member.jerseyNumber}` : null,
    member.position ?? null,
  ].filter(Boolean);

  type StatCell = { n: string; l: string };
  const stats: StatCell[] = [];
  if (playerOfMonth.goals != null) stats.push({ n: String(playerOfMonth.goals), l: 'Buts' });
  if (playerOfMonth.assists != null) stats.push({ n: String(playerOfMonth.assists), l: 'Passes' });
  if (playerOfMonth.extraStatLabel && playerOfMonth.extraStatValue) {
    stats.push({ n: playerOfMonth.extraStatValue, l: playerOfMonth.extraStatLabel });
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: compact ? 200 : 220 }}>
        {photo ? (
          <div style={{
            width: '100%', height: '100%',
            backgroundImage: `url(${photo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: LRH.navy,
          }} />
        ) : (
          <ImageSlot label={`Portrait — ${fullName}`} height={compact ? 200 : 220} tone="navy" radius={0} />
        )}
        {playerOfMonth.sponsor && (
          <div style={{
            position: 'absolute', top: 16, left: 16,
            padding: '6px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', gap: 8,
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              présenté par
            </span>
            <span style={{ ...display, fontWeight: 800, fontSize: 11, color: LRH.navy, letterSpacing: '0.04em' }}>
              {playerOfMonth.sponsor.toUpperCase()}
            </span>
          </div>
        )}
        <div style={{
          position: 'absolute', top: 16, right: 16,
          padding: '6px 10px', borderRadius: 4,
          background: LRH.gold, color: LRH.navy,
          ...display, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em',
        }}>★ MVP</div>
      </div>
      <div style={{ padding: compact ? 18 : 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ ...mono, fontSize: 10.5, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
            Joueur du mois
          </div>
          {playerOfMonth.periodLabel && (
            <div style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {playerOfMonth.periodLabel}
            </div>
          )}
        </div>
        <h3 style={{ ...display, fontWeight: 700, fontSize: compact ? 24 : 28, color: LRH.navy, margin: '10px 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>
          {fullName}
        </h3>
        {subtitleParts.length > 0 && (
          <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
            {subtitleParts.join(' · ')}
          </div>
        )}
        {playerOfMonth.quote && (
          <blockquote style={{
            margin: '14px 0 0', padding: '10px 12px',
            background: LRH.paperWarm, borderLeft: `3px solid ${LRH.gold}`,
            ...body, fontSize: 12.5, color: LRH.ink2, fontStyle: 'italic', lineHeight: 1.45,
          }}>
            « {playerOfMonth.quote} »
          </blockquote>
        )}
        {stats.length > 0 && (
          <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid ' + LRH.hair }}>
            {stats.map((s, i) => <Stat key={i} n={s.n} l={s.l} />)}
          </div>
        )}
      </div>
    </Card>
  );
}

export function BentoDesktop({ mode, lastResult, standingsTop, playerOfMonth }: {
  mode: Mode;
  lastResult: LastResult;
  standingsTop: StandingsTop;
  playerOfMonth: PlayerOfMonth;
}) {
  return (
    <div style={{ padding: 'clamp(36px, 5vw, 64px) clamp(20px, 4.5vw, 64px) clamp(24px, 3vw, 32px)' }}>
      <SectionHeading kicker="01 · La semaine" title="Résultats, classement &amp; figures fortes" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 'clamp(14px, 1.6vw, 20px)',
        marginTop: 28,
      }}>
        <LastResultCard mode={mode} match={lastResult} />
        <StandingsTopCard mode={mode} standingsTop={standingsTop} />
        <PlayerOfMonthCard playerOfMonth={playerOfMonth} />
      </div>
    </div>
  );
}

export function BentoMobile({ mode, lastResult, standingsTop, playerOfMonth }: {
  mode: Mode;
  lastResult: LastResult;
  standingsTop: StandingsTop;
  playerOfMonth: PlayerOfMonth;
}) {
  return (
    <div style={{ padding: '36px 16px 0' }}>
      <MobileSectionLabel kicker="01 · La semaine" />
      <MobileSectionTitle>Résultats &amp; classement.</MobileSectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <LastResultCard mode={mode} match={lastResult} compact />
        <StandingsTopCard mode={mode} standingsTop={standingsTop} compact />
        {playerOfMonth && <PlayerOfMonthCard playerOfMonth={playerOfMonth} compact />}
      </div>
    </div>
  );
}
