'use client';

import React from 'react';
import { LRH, mono, display, body } from '../tokens';
import { formatMatchDay } from '@/lib/utils/match-format';
import { formatCourseTime, type CourseSession } from '@/lib/utils/youth-course';

export type CourseGathering = {
  id: string;
  date: Date | string;
  location: string | null;
  venue: { name: string; city: string | null } | null;
};
export type CourseRow = {
  id: string;
  category: string;
  athleteName: string;
  team: string | null;
  timeMs: number;
  approximate: boolean;
  gathering: CourseGathering;
};

/**
 * « Parcours du jeune hockeyeur » : les chronos de l'atelier technique, par
 * journée puis par catégorie. La journée la plus récente est dépliée, les
 * précédentes repliées dans un `<details>` natif (clavier et lecteur d'écran
 * gérés par le navigateur, aucun state).
 *
 * Même grammaire que `YouthRefereesBoard` : rang, nom, pill — or pour le
 * meilleur chrono. Un chrono relevé à la louche garde son « ≈ ».
 */
export function YouthCourseBoard({
  sessions,
  mobileVariant = false,
}: {
  sessions: CourseSession<CourseGathering, CourseRow>[];
  mobileVariant?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
      {sessions.map((s, i) => (
        <details
          key={s.gathering.id}
          open={i === 0}
          style={{ background: '#fff', border: '1px solid ' + LRH.hairStrong }}
        >
          {/* `display` laissé à `list-item` : c'est lui qui porte le triangle
              natif, seul indice visible qu'une journée repliée s'ouvre. */}
          <summary style={{
            cursor: 'pointer',
            padding: mobileVariant ? '12px 16px' : '14px 22px', minHeight: 44,
            boxSizing: 'border-box', lineHeight: 1.6,
          }}>
            <span style={{
              ...display, fontWeight: 800, fontSize: mobileVariant ? 15 : 17,
              color: LRH.navy, letterSpacing: '-0.01em', marginRight: 14,
            }}>
              {formatMatchDay(new Date(s.gathering.date))}
            </span>
            <span style={{
              ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
              letterSpacing: '0.14em', textTransform: 'uppercase', display: 'inline-block',
            }}>
              {placeLabel(s.gathering)} · {s.series.map((x) => x.category).join(' · ')}
            </span>
          </summary>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: mobileVariant ? 14 : 20,
            padding: mobileVariant ? '4px 12px 16px' : '6px 22px 22px',
          }}>
            {s.series.map((series) => (
              <SeriesCard key={series.category} series={series} mobileVariant={mobileVariant} />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function placeLabel(g: CourseGathering): string {
  if (g.venue) return g.venue.city ? `${g.venue.name}, ${g.venue.city}` : g.venue.name;
  return g.location ?? 'Lieu non précisé';
}

function SeriesCard({
  series,
  mobileVariant,
}: {
  series: CourseSession<CourseGathering, CourseRow>['series'][number];
  mobileVariant: boolean;
}) {
  const best = series.rows[0];
  const hasTeams = series.rows.some((r) => r.team);
  return (
    <section
      aria-label={`Parcours ${series.category}`}
      style={{ border: '1px solid ' + LRH.hair, borderTop: `3px solid ${LRH.gold}` }}
    >
      <header style={{
        padding: mobileVariant ? '10px 12px' : '12px 16px',
        borderBottom: '1px solid ' + LRH.hair,
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
        justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{
          ...mono, fontSize: 10.5, fontWeight: 800, color: LRH.navy,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>⏱ {series.category} · {series.rows.length} chrono{series.rows.length > 1 ? 's' : ''}</span>
        <span style={{ ...body, fontSize: 12.5, color: LRH.ink2 }}>
          Meilleur : <strong style={{ color: LRH.navy }}>{best.athleteName}</strong>{' '}
          {formatCourseTime(best.timeMs, best.approximate)}
        </span>
      </header>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {series.rows.map((r, i) => {
          const rank = series.ranks[i];
          const podium = rank <= 3;
          return (
            <li key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: mobileVariant ? '8px 12px' : '8px 16px',
              borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
              boxShadow: rank === 1 ? `inset 4px 0 0 ${LRH.gold}` : undefined,
              minHeight: 40,
            }}>
              <span style={{
                ...mono, fontSize: 10.5, fontWeight: 800, width: 22, flex: '0 0 22px',
                color: podium ? LRH.navy : LRH.mute, textAlign: 'right',
              }}>{rank}</span>
              <span style={{
                ...body, fontSize: 14, fontWeight: podium ? 700 : 600, color: LRH.ink,
                flex: '1 1 auto', minWidth: 0, overflowWrap: 'break-word',
              }}>
                {r.athleteName}
                {hasTeams && r.team && (
                  <span style={{
                    ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute,
                    letterSpacing: '0.08em', marginLeft: 8, whiteSpace: 'nowrap',
                  }}>{r.team}</span>
                )}
              </span>
              <span style={{
                ...display, fontSize: 12.5, fontWeight: 800, flex: '0 0 auto',
                padding: '3px 9px', whiteSpace: 'nowrap',
                background: rank === 1 ? LRH.gold : LRH.navy,
                color: rank === 1 ? LRH.navy : '#fff',
                letterSpacing: '-0.01em',
              }}>
                {formatCourseTime(r.timeMs, r.approximate)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
