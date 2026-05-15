'use client';

import React from 'react';
import {
  LRH, mono, display, body,
  ClubCrest, ImageSlot, Card, CardHeader, CardHeaderDark, Stat,
} from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { SectionHeading, MobileSectionLabel, MobileSectionTitle } from './SectionHeading';
import type { Mode } from './Header';

type LastResult = ModeData['lastResult'];
type StandingsTop = ModeData['standingsTop'];

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
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        kicker="Dernier résultat"
        meta={`${match.matchday ? `J${match.matchday}` : ''}${match.venue ? ` · ${match.venue.split('·')[0].trim()}` : ''}`}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
          <ClubCrest id={home.shortCode ?? undefined} size={56} />
          <div>
            <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy }}>{home.name}</div>
            <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>Domicile</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, ...display, fontWeight: 800, fontSize: 64, letterSpacing: '-0.04em', color: LRH.navy, lineHeight: 1 }}>
          <span style={{ color: hs > as ? LRH.navy : LRH.mute }}>{hs}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: LRH.mute, ...mono, letterSpacing: '0.06em' }}>—</span>
          <span style={{ color: as > hs ? LRH.red : LRH.mute }}>{as}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row-reverse', textAlign: 'right' }}>
          <ClubCrest id={away.shortCode ?? undefined} size={56} />
          <div>
            <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy }}>{away.name}</div>
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

export function PlayerOfMonthCard() {
  return (
    <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 220 }}>
        <ImageSlot label="Portrait — Loïc Payet, milieu offensif USPG" height={220} tone="navy" radius={0} />
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
            CRÉDIT&nbsp;PEÏ
          </span>
        </div>
        <div style={{
          position: 'absolute', top: 16, right: 16,
          padding: '6px 10px', borderRadius: 4,
          background: LRH.gold, color: LRH.navy,
          ...display, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em',
        }}>★ MVP</div>
      </div>
      <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...mono, fontSize: 10.5, color: LRH.red, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>
          Joueur du mois
        </div>
        <h3 style={{ ...display, fontWeight: 700, fontSize: 28, color: LRH.navy, margin: '10px 0 4px', letterSpacing: '-0.02em', lineHeight: 1 }}>
          Loïc Payet
        </h3>
        <div style={{ ...body, fontSize: 13, color: LRH.mute }}>
          USPG Le Port · #11 · Milieu
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 18, paddingTop: 16, borderTop: '1px solid ' + LRH.hair }}>
          <Stat n="9" l="Buts" />
          <Stat n="6" l="Passes" />
          <Stat n="2.4" l="xG/match" />
        </div>
      </div>
    </Card>
  );
}

export function BentoDesktop({ mode, lastResult, standingsTop }: {
  mode: Mode;
  lastResult: LastResult;
  standingsTop: StandingsTop;
}) {
  return (
    <div style={{ padding: '64px 64px 32px' }}>
      <SectionHeading kicker="01 · La semaine" title="Résultats, classement &amp; figures fortes" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.1fr',
        gap: 20, marginTop: 28,
      }}>
        <LastResultCard mode={mode} match={lastResult} />
        <StandingsTopCard mode={mode} standingsTop={standingsTop} />
        <PlayerOfMonthCard />
      </div>
    </div>
  );
}

export function BentoMobile({ mode, lastResult, standingsTop }: {
  mode: Mode;
  lastResult: LastResult;
  standingsTop: StandingsTop;
}) {
  return (
    <div style={{ padding: '36px 16px 0' }}>
      <MobileSectionLabel kicker="01 · La semaine" />
      <MobileSectionTitle>Résultats &amp; classement.</MobileSectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        <LastResultCard mode={mode} match={lastResult} compact />
        <StandingsTopCard mode={mode} standingsTop={standingsTop} compact />
      </div>
    </div>
  );
}
