'use client';

import React from 'react';
import { LRH, body, display, mono, MODE_COLOR } from '../tokens';
import { MONTHS_SHORT, formatMatchDay } from '@/lib/utils/match-format';
import type { YouthGathering } from '@/lib/queries/youth';

/**
 * Calendrier des rassemblements jeunes.
 *
 * Ce n'est pas un calendrier de matchs : les équipes se constituent sur place
 * le jour même. On affiche donc une JOURNÉE (date, lieu, plage horaire,
 * format), jamais une affiche « club A contre club B ».
 *
 * Le parti pris d'affichage, et c'est le cœur du composant : **une information
 * manquante s'affiche comme manquante**. Au moment où la commission arrête son
 * calendrier, trois lieux sur neuf ne sont pas décidés. Les masquer donnerait
 * une ligne muette que le lecteur interprétera comme une erreur du site ; on
 * écrit « Lieu à confirmer » en toutes lettres, dans la couleur des mentions
 * en attente. Même logique que `sideName` pour une équipe non qualifiée.
 */

/** `date` traverse le cache de données, donc arrive en chaîne ISO. */
type GatheringLike = Omit<YouthGathering, 'date'> & { date: Date | string };

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function monthKey(d: Date): string {
  // Mois lu en heure Réunion, comme partout ailleurs (cf. datetime-reunion).
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Indian/Reunion',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(d);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1') - 1;
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${MONTHS_SHORT[month]} ${year}`;
}

function timeRange(g: GatheringLike): string | null {
  if (g.startTime && g.endTime) return `${g.startTime} – ${g.endTime}`;
  if (g.startTime) return `À partir de ${g.startTime}`;
  return null;
}

function placeLabel(g: GatheringLike): { text: string; confirmed: boolean } {
  if (g.venue) {
    return { text: g.venue.city ? `${g.venue.name} · ${g.venue.city}` : g.venue.name, confirmed: true };
  }
  if (g.location) return { text: g.location, confirmed: true };
  return { text: 'Lieu à confirmer', confirmed: false };
}

function DayCell({ date, mobileVariant }: { date: Date; mobileVariant: boolean }) {
  // « DIM 26 SEPT » découpé pour empiler jour / numéro / mois.
  const [weekday, day, month] = formatMatchDay(date).split(' ');
  return (
    <div style={{
      width: mobileVariant ? 56 : 68,
      flexShrink: 0,
      textAlign: 'center',
    }}>
      <div style={{
        ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.mute,
        letterSpacing: '0.16em', textTransform: 'uppercase',
      }}>{weekday}</div>
      <div style={{
        ...display, fontWeight: 800,
        fontSize: mobileVariant ? 30 : 36,
        color: LRH.navy, lineHeight: 1, letterSpacing: '-0.04em',
        margin: '2px 0 3px',
      }}>{day}</div>
      <div style={{
        ...mono, fontSize: 9.5, fontWeight: 700, color: LRH.red,
        letterSpacing: '0.14em', textTransform: 'uppercase',
      }}>{month}</div>
    </div>
  );
}

function GatheringRow({
  gathering,
  isNext,
  mobileVariant,
}: {
  gathering: GatheringLike;
  isNext: boolean;
  mobileVariant: boolean;
}) {
  const date = toDate(gathering.date);
  const place = placeLabel(gathering);
  const hours = timeRange(gathering);
  const palette = MODE_COLOR[gathering.mode];

  return (
    <div style={{
      display: 'flex',
      gap: mobileVariant ? 12 : 20,
      alignItems: 'flex-start',
      padding: mobileVariant ? '14px 0' : '18px 0',
      borderBottom: '1px solid ' + LRH.hair,
    }}>
      <DayCell date={date} mobileVariant={mobileVariant} />

      {/* Accent vertical : couleur de la discipline, comme les cards LRH. */}
      <div style={{
        width: 3, alignSelf: 'stretch', flexShrink: 0,
        background: palette.bg,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          gap: 8, marginBottom: 6,
        }}>
          {isNext && (
            <span style={{
              ...mono, fontSize: 9, fontWeight: 700,
              background: LRH.gold, color: LRH.navy,
              padding: '3px 7px', letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>Prochain</span>
          )}
          <span style={{
            ...mono, fontSize: 9, fontWeight: 700,
            background: palette.soft, color: palette.bg,
            padding: '3px 7px', letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>{palette.label}</span>
          {gathering.categories && (
            <span style={{
              ...mono, fontSize: 9, fontWeight: 700,
              color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>{gathering.categories}</span>
          )}
        </div>

        <div style={{
          ...body, fontSize: mobileVariant ? 14.5 : 16,
          fontWeight: 700, color: place.confirmed ? LRH.navy : LRH.mute,
          fontStyle: place.confirmed ? 'normal' : 'italic',
          lineHeight: 1.3,
        }}>{place.text}</div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: mobileVariant ? 10 : 16,
          marginTop: 5,
        }}>
          {hours && (
            <span style={{ ...mono, fontSize: 10.5, color: LRH.ink2, letterSpacing: '0.06em' }}>
              {hours}
            </span>
          )}
          {gathering.format && (
            <span style={{ ...mono, fontSize: 10.5, color: LRH.ink2, letterSpacing: '0.06em' }}>
              {gathering.format}
            </span>
          )}
        </div>

        {gathering.notes && (
          <div style={{
            ...body, fontSize: 12.5, color: LRH.mute,
            marginTop: 6, lineHeight: 1.5,
          }}>{gathering.notes}</div>
        )}
      </div>
    </div>
  );
}

export function YouthGatheringsBoard({
  gatherings,
  mobileVariant = false,
  emptyLabel = 'Le calendrier des rassemblements sera publié ici dès sa validation.',
}: {
  gatherings: GatheringLike[];
  mobileVariant?: boolean;
  emptyLabel?: string;
}) {
  // Premier rassemblement encore à venir : mis en avant par une pastille.
  // Comparaison au jour près — un rassemblement du jour reste « le prochain »
  // jusqu'à minuit, il n'a pas d'heure de fin fiable.
  const nextId = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = gatherings
      .map((g) => ({ id: g.id, date: toDate(g.date) }))
      .filter((g) => g.date.getTime() >= today.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming[0]?.id ?? null;
  }, [gatherings]);

  const months = React.useMemo(() => {
    const groups: { label: string; rows: GatheringLike[] }[] = [];
    for (const g of gatherings) {
      const label = monthKey(toDate(g.date));
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.rows.push(g);
      else groups.push({ label, rows: [g] });
    }
    return groups;
  }, [gatherings]);

  if (gatherings.length === 0) {
    return (
      <div style={{
        padding: mobileVariant ? 28 : 40,
        textAlign: 'center',
        background: '#fff',
        border: '1px solid ' + LRH.hair,
      }}>
        <div style={{
          ...mono, fontSize: 10.5, color: LRH.mute,
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>[ à venir ]</div>
        <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>{emptyLabel}</div>
      </div>
    );
  }

  return (
    <div>
      {months.map((month) => (
        <div key={month.label}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '20px 0 12px',
            borderTop: '1px dashed ' + LRH.hairStrong,
            marginTop: 8,
          }}>
            <div style={{ width: 12, height: 12, background: LRH.gold }} />
            <div style={{
              ...display, fontWeight: 700,
              fontSize: mobileVariant ? 18 : 22,
              color: LRH.navy, letterSpacing: '-0.02em',
            }}>{month.label}</div>
            <div style={{ flex: 1, height: 1, background: LRH.hair }} />
            <div style={{
              ...mono, fontSize: 10.5, fontWeight: 700, color: LRH.mute,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              {month.rows.length.toString().padStart(2, '0')}{' '}
              {month.rows.length > 1 ? 'dates' : 'date'}
            </div>
          </div>
          {month.rows.map((g) => (
            <GatheringRow
              key={g.id}
              gathering={g}
              isNext={g.id === nextId}
              mobileVariant={mobileVariant}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
