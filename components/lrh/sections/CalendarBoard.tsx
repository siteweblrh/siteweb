'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display, body, ClubCrest } from '../tokens';
import type { AllModeMatch } from '@/lib/queries/competition';
import { formatMatchTime, formatStatus } from '@/lib/utils/match-format';

const WEEKDAYS_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type MatchVariant = 'past' | 'live' | 'upcoming';

function getVariant(m: AllModeMatch): MatchVariant {
  if (m.status === 'LIVE' || m.status === 'HALFTIME') return 'live';
  if (m.status === 'FINISHED') return 'past';
  return 'upcoming';
}

function groupByDay(matches: AllModeMatch[]) {
  const groups: Record<string, AllModeMatch[]> = {};
  for (const m of matches) {
    const d = new Date(m.kickoffAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return Object.entries(groups).map(([key, list]) => {
    const sample = new Date(list[0].kickoffAt);
    return { key, date: sample, matches: list };
  });
}

function groupByMonth(days: ReturnType<typeof groupByDay>) {
  const out: { monthLabel: string; days: ReturnType<typeof groupByDay> }[] = [];
  for (const d of days) {
    const label = `${MONTHS[d.date.getMonth()]} ${d.date.getFullYear()}`;
    const last = out[out.length - 1];
    if (last && last.monthLabel === label) last.days.push(d);
    else out.push({ monthLabel: label, days: [d] });
  }
  return out;
}

export function MonthBand({ label, count }: { label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '20px 0 14px',
      borderTop: '1px dashed ' + LRH.hairStrong,
      marginTop: 8,
    }}>
      <div style={{ width: 12, height: 12, background: LRH.gold }} />
      <div style={{
        ...display, fontWeight: 700, fontSize: 22, color: LRH.navy,
        letterSpacing: '-0.02em',
      }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: LRH.hair }} />
      <div style={{
        ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.mute,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>{count.toString().padStart(2, '0')} {count > 1 ? 'rencontres' : 'rencontre'}</div>
    </div>
  );
}

function DateRail({ date, mobileVariant = false }: { date: Date; mobileVariant?: boolean }) {
  const isToday = (() => {
    const t = new Date();
    return t.toDateString() === date.toDateString();
  })();
  return (
    <div style={{
      flexShrink: 0,
      width: mobileVariant ? 64 : 96,
      paddingTop: 6,
      borderRight: mobileVariant ? 'none' : '1px solid ' + LRH.hair,
      paddingRight: mobileVariant ? 0 : 18,
    }}>
      <div style={{
        ...mono, fontSize: 10, fontWeight: 700,
        color: isToday ? LRH.red : LRH.mute,
        letterSpacing: '0.16em', textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        {isToday ? '● AUJOURD\'HUI' : WEEKDAYS_LONG[date.getDay()].slice(0, 3).toUpperCase()}
      </div>
      <div style={{
        ...display, fontWeight: 800,
        fontSize: mobileVariant ? 44 : 56,
        color: isToday ? LRH.red : LRH.navy,
        lineHeight: 0.9, letterSpacing: '-0.05em',
      }}>{date.getDate().toString().padStart(2, '0')}</div>
      <div style={{
        ...mono, fontSize: 10, color: LRH.mute,
        letterSpacing: '0.1em', marginTop: 4,
      }}>{MONTHS[date.getMonth()].slice(0, 3).toUpperCase()}</div>
    </div>
  );
}

function MatchRichCard({ m, mobileVariant = false }: { m: AllModeMatch; mobileVariant?: boolean }) {
  const variant = getVariant(m);
  const hs = m.homeScore;
  const as = m.awayScore;
  const homeWins = hs != null && as != null && hs > as;
  const awayWins = hs != null && as != null && as > hs;

  const accentColor = variant === 'live' ? LRH.red : variant === 'past' ? LRH.navy : LRH.gold;

  return (
    <Link
      href={`/match/${m.id}`}
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accentColor}`,
        padding: mobileVariant ? '16px 14px' : '20px 24px',
        display: 'flex', alignItems: 'center', gap: mobileVariant ? 12 : 20,
        transition: 'all 0.2s',
        textDecoration: 'none', color: 'inherit',
      }}>
      {/* Time column */}
      <div style={{
        flexShrink: 0,
        width: mobileVariant ? 58 : 76,
        textAlign: 'center',
        borderRight: '1px solid ' + LRH.hair,
        paddingRight: mobileVariant ? 12 : 16,
      }}>
        {variant === 'live' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 6px', borderRadius: 2,
            background: LRH.red, color: '#fff',
            ...mono, fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
            marginBottom: 6,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
            LIVE
          </div>
        )}
        <div style={{
          ...mono, fontSize: 14, fontWeight: 700,
          color: LRH.navy, letterSpacing: '0.04em',
        }}>{formatMatchTime(m.kickoffAt)}</div>
        {m.matchday != null && (
          <div style={{
            ...mono, fontSize: 9, color: LRH.mute,
            letterSpacing: '0.1em', marginTop: 4,
          }}>J{m.matchday.toString().padStart(2, '0')}</div>
        )}
      </div>

      {/* Teams + score */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: mobileVariant ? 8 : 14 }}>
        {/* Home */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClubCrest id={m.homeClub.shortCode ?? undefined} size={mobileVariant ? 30 : 36} slug={m.homeClub.slug} noLink />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              ...display, fontWeight: 700,
              fontSize: mobileVariant ? 13 : 14.5,
              color: homeWins ? LRH.navy : LRH.ink2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{m.homeClub.name}</div>
            {homeWins && !mobileVariant && (
              <div style={{ width: 24, height: 2, background: LRH.gold, marginTop: 4 }} />
            )}
          </div>
        </div>

        {/* Score */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 6,
          padding: mobileVariant ? '4px 8px' : '6px 14px',
          background: variant === 'past' ? LRH.paperWarm : 'transparent',
          border: variant === 'upcoming' ? '1px dashed ' + LRH.hairStrong : 'none',
          borderRadius: 2,
        }}>
          {hs != null && as != null ? (
            <>
              <span style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 20 : 26,
                color: homeWins ? LRH.navy : LRH.mute,
                letterSpacing: '-0.03em',
              }}>{hs}</span>
              <span style={{ ...mono, fontSize: 12, color: LRH.mute }}>—</span>
              <span style={{
                ...display, fontWeight: 800,
                fontSize: mobileVariant ? 20 : 26,
                color: awayWins ? LRH.red : LRH.mute,
                letterSpacing: '-0.03em',
              }}>{as}</span>
            </>
          ) : (
            <span style={{
              ...mono, fontSize: 12, fontWeight: 700,
              color: LRH.mute, letterSpacing: '0.14em',
            }}>VS</span>
          )}
        </div>

        {/* Away */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          gap: 10, flexDirection: 'row-reverse',
        }}>
          <ClubCrest id={m.awayClub.shortCode ?? undefined} size={mobileVariant ? 30 : 36} slug={m.awayClub.slug} noLink />
          <div style={{ minWidth: 0, flex: 1, textAlign: 'right' }}>
            <div style={{
              ...display, fontWeight: 700,
              fontSize: mobileVariant ? 13 : 14.5,
              color: awayWins ? LRH.navy : LRH.ink2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{m.awayClub.name}</div>
            {awayWins && !mobileVariant && (
              <div style={{ width: 24, height: 2, background: LRH.gold, marginTop: 4, marginLeft: 'auto' }} />
            )}
          </div>
        </div>
      </div>

      {/* Right meta */}
      {!mobileVariant && (
        <div style={{
          flexShrink: 0, paddingLeft: 16, borderLeft: '1px solid ' + LRH.hair,
          minWidth: 160, textAlign: 'right',
        }}>
          <div style={{
            ...mono, fontSize: 9.5, fontWeight: 700,
            color: accentColor, letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>{formatStatus(m.status, hs, as)}</div>
          <div style={{
            ...body, fontSize: 11.5, color: LRH.mute,
            marginTop: 4, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{m.venue || m.competition.name}</div>
          <div style={{
            ...mono, fontSize: 9.5, fontWeight: 700,
            color: LRH.navy, letterSpacing: '0.14em',
            textTransform: 'uppercase', marginTop: 6,
          }}>Détails ▸</div>
        </div>
      )}
    </Link>
  );
}

export function CalendarBoard({
  matches,
  emptyLabel = 'Aucun match à afficher pour ce filtre.',
  mobileVariant = false,
}: {
  matches: AllModeMatch[];
  emptyLabel?: string;
  mobileVariant?: boolean;
}) {
  if (matches.length === 0) {
    return (
      <div style={{
        padding: 48, textAlign: 'center',
        background: '#fff', border: '1px solid ' + LRH.hair,
        borderRadius: 4, margin: mobileVariant ? '20px 16px' : 32,
      }}>
        <div style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          [ vide ]
        </div>
        <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>{emptyLabel}</div>
      </div>
    );
  }

  const days = groupByDay(matches);
  const months = groupByMonth(days);

  return (
    <div style={{ padding: mobileVariant ? '8px 16px 48px' : '0 64px 64px' }}>
      {months.map((month) => (
        <div key={month.monthLabel}>
          <MonthBand label={month.monthLabel} count={month.days.reduce((acc, d) => acc + d.matches.length, 0)} />
          {month.days.map((day) => (
            <div key={day.key} style={{
              display: 'flex',
              gap: mobileVariant ? 12 : 24,
              padding: mobileVariant ? '14px 0' : '20px 0',
              borderBottom: '1px solid ' + LRH.hair,
              alignItems: mobileVariant ? 'flex-start' : 'flex-start',
              flexDirection: mobileVariant ? 'column' : 'row',
            }}>
              <DateRail date={day.date} mobileVariant={mobileVariant} />
              <div style={{
                flex: 1, minWidth: 0, width: mobileVariant ? '100%' : 'auto',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {day.matches.map((m) => <MatchRichCard key={m.id} m={m} mobileVariant={mobileVariant} />)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
