'use client';

import React from 'react';
import { LRH, mono, display, body, ClubCrest, Card } from '../tokens';
import type { ModeData } from '@/lib/queries/home';
import { formatMatchDay, formatMatchTime } from '@/lib/utils/match-format';
import { MobileSectionLabel, MobileSectionTitle } from './SectionHeading';
import type { Mode } from './Header';

type UpcomingMatch = ModeData['upcoming'][number];

const CATEGORIES = ['D2', 'U18', 'Féminines', 'Coupe'];

export function ChipDark({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div style={{
      padding: '8px 14px', borderRadius: 999,
      background: active ? LRH.gold : 'rgba(255,255,255,0.06)',
      color: active ? LRH.navy : 'rgba(255,255,255,0.78)',
      ...body, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
      border: active ? 'none' : '1px solid rgba(255,255,255,0.08)',
      cursor: 'pointer',
    }}>{children}</div>
  );
}

export function ChipLight({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div style={{
      padding: '7px 12px', borderRadius: 999, flexShrink: 0,
      background: active ? LRH.navy : '#fff',
      color: active ? '#fff' : LRH.ink2,
      border: active ? 'none' : '1px solid ' + LRH.hairStrong,
      ...body, fontSize: 11.5, fontWeight: 700,
    }}>{children}</div>
  );
}

export function UpcomingMatchCard({ match, variant = 'desktop' }: {
  match: UpcomingMatch;
  variant?: 'desktop' | 'mobile';
}) {
  if (variant === 'mobile') {
    return (
      <Card style={{ padding: 16 }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.red, letterSpacing: '0.12em', marginBottom: 10 }}>
          {formatMatchDay(match.kickoffAt)} · {formatMatchTime(match.kickoffAt)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClubCrest id={match.homeClub.shortCode ?? undefined} size={28} />
            <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{match.homeClub.name}</span>
          </div>
          <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.1em' }}>VS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
            <ClubCrest id={match.awayClub.shortCode ?? undefined} size={28} />
            <span style={{ ...display, fontSize: 13, fontWeight: 600, color: LRH.navy }}>{match.awayClub.name}</span>
          </div>
        </div>
        {match.venue && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid ' + LRH.hair, ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            📍 {match.venue}
          </div>
        )}
      </Card>
    );
  }

  return (
    <div style={{
      padding: 18, borderRadius: 14, background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10.5, color: LRH.gold, letterSpacing: '0.12em', marginBottom: 16 }}>
        <span>{formatMatchDay(match.kickoffAt)}</span>
        <span>{formatMatchTime(match.kickoffAt)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <ClubCrest id={match.homeClub.shortCode ?? undefined} size={32} />
        <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{match.homeClub.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ClubCrest id={match.awayClub.shortCode ?? undefined} size={32} />
        <span style={{ ...display, fontSize: 14, fontWeight: 600 }}>{match.awayClub.name}</span>
      </div>
      {match.venue && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', ...mono, fontSize: 9.5, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {match.venue}
        </div>
      )}
    </div>
  );
}

export function CompetitionsDesktop({ mode, upcoming }: { mode: Mode; upcoming: ModeData['upcoming'] }) {
  return (
    <div style={{ padding: '48px 64px', background: LRH.navy, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ ...mono, fontSize: 11, color: LRH.gold, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
            03 · Calendrier
          </div>
          <h2 style={{ ...display, fontWeight: 700, fontSize: 40, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Les prochaines journées.
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ChipDark active>D1 {mode === 'gazon' ? 'Gazon' : 'Salle'}</ChipDark>
          {CATEGORIES.map((c) => <ChipDark key={c}>{c}</ChipDark>)}
        </div>
      </div>
      {upcoming.length === 0 ? (
        <div style={{ padding: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14 }}>
          <p style={{ ...body, fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Aucun match programmé pour le moment.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {upcoming.map((m) => <UpcomingMatchCard key={m.id} match={m} variant="desktop" />)}
        </div>
      )}
    </div>
  );
}

export function CompetitionsMobile({ mode, upcoming }: { mode: Mode; upcoming: ModeData['upcoming'] }) {
  return (
    <div style={{ padding: '36px 0 0' }}>
      <div style={{ padding: '0 16px' }}>
        <MobileSectionLabel kicker="02 · Calendrier" />
        <MobileSectionTitle>Les prochaines journées.</MobileSectionTitle>
      </div>
      <div style={{ marginTop: 18, padding: '0 16px 4px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <ChipLight active>D1 {mode === 'gazon' ? 'Gazon' : 'Salle'}</ChipLight>
        {CATEGORIES.map((c) => <ChipLight key={c}>{c}</ChipLight>)}
      </div>
      <div style={{ marginTop: 14, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcoming.length === 0 ? (
          <Card style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucun match programmé.</p>
          </Card>
        ) : upcoming.map((m) => <UpcomingMatchCard key={m.id} match={m} variant="mobile" />)}
      </div>
    </div>
  );
}
