'use client';

import React from 'react';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import type { AllModeMatch, CompetitionWithStandings } from '@/lib/queries/competition';

export type StandingRow = CompetitionWithStandings['standings'][number];
export type FormResult = 'V' | 'N' | 'D';

const FORM_COLORS: Record<FormResult, { bg: string; fg: string }> = {
  V: { bg: '#1d6b3f', fg: '#fff' },
  N: { bg: LRH.mute, fg: '#fff' },
  D: { bg: LRH.red, fg: '#fff' },
};

export function computeForm(matches: AllModeMatch[], clubId: string, limit = 5): FormResult[] {
  const finished = matches
    .filter((m) => m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null)
    .filter((m) => m.homeClubId === clubId || m.awayClubId === clubId)
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
    .slice(0, limit);
  return finished.map((m) => {
    const isHome = m.homeClubId === clubId;
    const own = isHome ? m.homeScore! : m.awayScore!;
    const opp = isHome ? m.awayScore! : m.homeScore!;
    if (own > opp) return 'V';
    if (own < opp) return 'D';
    return 'N';
  });
}

function FormChip({ result }: { result: FormResult }) {
  const c = FORM_COLORS[result];
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 2,
      background: c.bg, color: c.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      ...display, fontWeight: 800, fontSize: 11, letterSpacing: '-0.01em',
    }}>{result}</div>
  );
}

export function StandingsBoard({
  rows,
  matches,
  qualifZone = 3,
  relegationZone = 1,
  mobileVariant = false,
  highlightClubId,
}: {
  rows: StandingRow[];
  matches: AllModeMatch[];
  qualifZone?: number;
  relegationZone?: number;
  mobileVariant?: boolean;
  highlightClubId?: string;
}) {
  const totalRows = rows.length;

  if (totalRows === 0) {
    return (
      <div style={{
        padding: 48, textAlign: 'center',
        background: '#fff', border: '1px solid ' + LRH.hair,
        margin: mobileVariant ? '0 16px' : 0,
      }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>[ vide ]</div>
        <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>Aucun classement disponible.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: mobileVariant ? '24px 16px 0' : '40px 64px 0' }}>
      {/* Column headers */}
      {!mobileVariant && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '4px 50px 1fr 130px 100px 60px 70px 80px',
          gap: 12, alignItems: 'center',
          padding: '0 18px 14px',
          borderBottom: '1px solid ' + LRH.hairStrong,
        }}>
          <div />
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Rang</div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Club</div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Forme · 5 derniers</div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center' }}>V · N · D</div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center' }}>BP/BC</div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'center' }}>Diff</div>
          <div style={{ ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute, letterSpacing: '0.16em', textTransform: 'uppercase', textAlign: 'right' }}>Pts</div>
        </div>
      )}

      <div style={{ background: '#fff', borderLeft: '1px solid ' + LRH.hair, borderRight: '1px solid ' + LRH.hair }}>
        {rows.map((row, i) => {
          const inQualif = row.rank <= qualifZone;
          const inRelegation = row.rank > totalRows - relegationZone;
          const zoneColor = inQualif ? '#1d6b3f' : inRelegation ? LRH.red : 'transparent';
          const gd = row.goalsFor - row.goalsAgainst;
          const gdLabel = (gd > 0 ? '+' : '') + gd;
          const form = computeForm(matches, row.club.id);
          const isHighlighted = highlightClubId === row.club.id;

          return (
            <div key={row.club.id} style={{
              display: 'grid',
              gridTemplateColumns: mobileVariant
                ? '4px 36px 1fr 60px'
                : '4px 50px 1fr 130px 100px 60px 70px 80px',
              gap: mobileVariant ? 8 : 12,
              alignItems: 'center',
              padding: mobileVariant ? '14px 12px' : '16px 18px',
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid ' + LRH.hair,
              background: isHighlighted
                ? 'rgba(0,34,68,0.06)'
                : row.rank === 1 ? 'rgba(243,188,28,0.04)' : '#fff',
              boxShadow: isHighlighted ? 'inset 0 0 0 1px ' + LRH.navy : undefined,
              transition: 'background 0.15s',
            }}>
              {/* Zone strip */}
              <div style={{ width: 4, alignSelf: 'stretch', background: zoneColor }} />

              {/* Rank */}
              <div style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 22 : 30,
                color: row.rank === 1 ? LRH.gold : LRH.navy,
                letterSpacing: '-0.04em', lineHeight: 1,
              }}>{row.rank.toString().padStart(2, '0')}</div>

              {/* Club */}
              <div style={{ display: 'flex', alignItems: 'center', gap: mobileVariant ? 10 : 14, minWidth: 0 }}>
                <ClubCrest id={row.club.shortCode ?? undefined} size={mobileVariant ? 30 : 38} slug={row.club.slug} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    ...display, fontWeight: 700,
                    fontSize: mobileVariant ? 13.5 : 15,
                    color: LRH.navy, letterSpacing: '-0.01em',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{row.club.name}</div>
                  <div style={{
                    ...mono, fontSize: 9.5, color: LRH.mute,
                    letterSpacing: '0.06em', marginTop: 2,
                  }}>{row.played} matchs joués</div>
                </div>
              </div>

              {!mobileVariant && (
                <>
                  {/* Form */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {form.length === 0 ? (
                      <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>—</span>
                    ) : form.map((r, idx) => <FormChip key={idx} result={r} />)}
                  </div>

                  {/* V N D */}
                  <div style={{ textAlign: 'center', ...mono, fontSize: 12, color: LRH.ink2, fontWeight: 600, letterSpacing: '0.04em' }}>
                    <span>{row.wins}</span>
                    <span style={{ color: LRH.mute }}> · </span>
                    <span>{row.draws}</span>
                    <span style={{ color: LRH.mute }}> · </span>
                    <span>{row.losses}</span>
                  </div>

                  {/* BP/BC */}
                  <div style={{ textAlign: 'center', ...mono, fontSize: 12, color: LRH.ink2, fontWeight: 600 }}>
                    {row.goalsFor}<span style={{ color: LRH.mute }}>/</span>{row.goalsAgainst}
                  </div>

                  {/* Diff */}
                  <div style={{
                    textAlign: 'center', ...mono, fontSize: 12, fontWeight: 700,
                    color: gd > 0 ? '#1d6b3f' : gd < 0 ? LRH.red : LRH.mute,
                  }}>{gdLabel}</div>
                </>
              )}

              {/* Points - gold pill for #1 */}
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: mobileVariant ? 44 : 56, padding: '6px 12px',
                  background: row.rank === 1 ? LRH.gold : LRH.navy,
                  color: row.rank === 1 ? LRH.navy : '#fff',
                  ...display, fontWeight: 800,
                  fontSize: mobileVariant ? 16 : 18,
                  letterSpacing: '-0.02em',
                  borderRadius: 2,
                }}>{row.points}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 16,
        display: 'flex', alignItems: 'center', gap: mobileVariant ? 16 : 24,
        flexWrap: 'wrap',
        ...mono, fontSize: 10, color: LRH.mute,
        letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: '#1d6b3f' }} />
          <span>Qualification</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: LRH.red }} />
          <span>Zone rouge</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 12, height: 12, background: LRH.gold }} />
          <span>Leader</span>
        </div>
      </div>
    </div>
  );
}
