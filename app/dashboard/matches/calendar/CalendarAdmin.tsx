'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, ClubCrest, MODE_COLOR } from '@/components/lrh/tokens';

/** Hook léger : true sous le breakpoint mobile. matchMedia est plus
 *  efficace qu'un resize listener (event throttling natif). */
function useIsMobileCal(breakpoint = 760): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = () => setM(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return m;
}
import { StatusBadge, ModeBadge } from '@/components/lrh/Badge';
import {
  deleteMatch,
  type AdminMatchRow,
  type ClubForAdmin,
  type CompetitionAdminRow,
} from '@/lib/actions/competition';
import type { VenueAdminRow } from '@/lib/queries/venue';
import type { RefereeAdminRow } from '@/lib/queries/referee';
import {
  MatchForm,
  EMPTY_FORM,
  rowToForm,
  type FormState,
} from '../MatchesAdmin';

type ModeFilter = 'ALL' | 'GAZON' | 'SALLE';

const FR_WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;
const FR_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

const pad = (n: number) => n.toString().padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Returns 42 dates starting on the Monday before/at the 1st of the month. */
function buildMonthGrid(year: number, month: number): Date[] {
  const monthStart = new Date(year, month, 1);
  // Lundi = 0 dans notre semaine FR
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarAdmin({
  matches,
  competitions,
  clubs,
  venues,
  referees,
  entriesByCompetition,
  clubId,
  isAdmin,
}: {
  matches: AdminMatchRow[];
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
  venues: VenueAdminRow[];
  referees: RefereeAdminRow[];
  entriesByCompetition: Record<string, string[]>;
  clubId?: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const isMobile = useIsMobileCal();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState<Date | null>(today);
  const [modeFilter, setModeFilter] = useState<ModeFilter>('ALL');
  const [competitionFilter, setCompetitionFilter] = useState<string>('');
  const [editing, setEditing] = useState<FormState | null>(null);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (modeFilter !== 'ALL' && m.competition.mode !== modeFilter) return false;
      if (competitionFilter && m.competition.id !== competitionFilter) return false;
      return true;
    });
  }, [matches, modeFilter, competitionFilter]);

  const matchesByDay = useMemo(() => {
    const map = new Map<string, AdminMatchRow[]>();
    for (const m of filteredMatches) {
      const k = dayKey(new Date(m.kickoffAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    // Sort each day's matches by kickoff
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    }
    return map;
  }, [filteredMatches]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const monthLabel = `${FR_MONTHS[cursor.month]} ${cursor.year}`;
  const selectedKey = selectedDay ? dayKey(selectedDay) : null;
  const selectedMatches = selectedKey ? (matchesByDay.get(selectedKey) ?? []) : [];

  const goPrev = () => {
    setCursor((c) => {
      const m = c.month - 1;
      return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
    });
  };
  const goNext = () => {
    setCursor((c) => {
      const m = c.month + 1;
      return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
    });
  };
  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDay(new Date(today));
  };

  const refresh = () => {
    setEditing(null);
    router.refresh();
  };

  const onDelete = async (m: AdminMatchRow) => {
    if (!confirm(`Supprimer le match ${m.homeClub.name} vs ${m.awayClub.name} du ${new Date(m.kickoffAt).toLocaleDateString('fr-FR')} ?`)) {
      return;
    }
    try {
      await deleteMatch(m.id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur de suppression');
    }
  };

  const openCreate = (date: Date) => {
    // Default kickoff = 14:00 local on the selected day
    const d = new Date(date);
    d.setHours(14, 0, 0, 0);
    setEditing(EMPTY_FORM({ kickoffAt: toDatetimeLocal(d) }));
  };

  const openEdit = (m: AdminMatchRow) => {
    setEditing(rowToForm(m));
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: '1px dashed ' + LRH.hairStrong,
        }}
      >
        {/* Month nav */}
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            border: '1px solid ' + LRH.hairStrong,
            background: '#fff',
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            style={{
              ...mono,
              fontSize: 14,
              fontWeight: 700,
              padding: '8px 14px',
              background: '#fff',
              color: LRH.navy,
              border: 'none',
              borderRight: '1px solid ' + LRH.hairStrong,
              cursor: 'pointer',
            }}
            aria-label="Mois précédent"
          >
            ◂
          </button>
          <div
            style={{
              ...display,
              fontSize: 15,
              fontWeight: 700,
              color: LRH.navy,
              padding: '8px 18px',
              minWidth: 180,
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}
          >
            {monthLabel}
          </div>
          <button
            type="button"
            onClick={goNext}
            style={{
              ...mono,
              fontSize: 14,
              fontWeight: 700,
              padding: '8px 14px',
              background: '#fff',
              color: LRH.navy,
              border: 'none',
              borderLeft: '1px solid ' + LRH.hairStrong,
              cursor: 'pointer',
            }}
            aria-label="Mois suivant"
          >
            ▸
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            padding: '8px 14px',
            background: 'transparent',
            color: LRH.navy,
            border: '1px solid ' + LRH.navy,
            cursor: 'pointer',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Aujourd'hui
        </button>

        {/* Mode filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['ALL', 'GAZON', 'SALLE'] as const).map((m) => {
            const active = modeFilter === m;
            const pal = m === 'GAZON' ? MODE_COLOR.GAZON : m === 'SALLE' ? MODE_COLOR.SALLE : null;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                style={{
                  ...mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '7px 12px',
                  background: active ? (pal?.bg ?? LRH.navy) : '#fff',
                  color: active ? (pal?.fg ?? '#fff') : LRH.mute,
                  border: '1px solid ' + (active ? (pal?.bg ?? LRH.navy) : LRH.hairStrong),
                  cursor: 'pointer',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {m === 'ALL' ? 'Tous' : m === 'GAZON' ? 'Gazon' : 'Salle'}
              </button>
            );
          })}
        </div>

        {/* Competition filter */}
        <select
          value={competitionFilter}
          onChange={(e) => setCompetitionFilter(e.target.value)}
          style={{
            ...body,
            fontSize: 12.5,
            padding: '7px 10px',
            border: '1px solid ' + LRH.hairStrong,
            background: '#fff',
            color: LRH.ink,
            cursor: 'pointer',
            minWidth: 220,
          }}
        >
          <option value="">Toutes compétitions</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.season} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'} · {c.name}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <Link
          href="/dashboard/matches"
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            padding: '8px 14px',
            background: 'transparent',
            color: LRH.navy,
            border: '1px solid ' + LRH.navy,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ☰ Vue liste
        </Link>
      </div>

      {/* Inline form when editing/creating */}
      {editing && (
        <MatchForm
          initial={editing}
          competitions={competitions}
          clubs={clubs}
          venues={venues}
          referees={referees}
          entriesByCompetition={entriesByCompetition}
          isAdmin={isAdmin}
          onCancel={() => setEditing(null)}
          onDone={refresh}
        />
      )}

      {/* En mobile (<760px) on bascule sur une vue agenda verticale plutôt
          que la grille 7-col (qui forçait un scroll horizontal disgracieux). */}
      {isMobile ? (
        <AgendaView
          grid={grid}
          today={today}
          selectedDay={selectedDay}
          matchesByDay={matchesByDay}
          onSelectDay={setSelectedDay}
          monthLabel={monthLabel}
        />
      ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(96px, 1fr))',
          gap: 1,
          background: LRH.hair,
          border: '1px solid ' + LRH.hairStrong,
          marginBottom: 16,
        }}
      >
        {/* Header row */}
        {FR_WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: LRH.navy,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              background: LRH.paperWarm,
              padding: '10px 12px',
              borderBottom: '1px solid ' + LRH.hairStrong,
              textAlign: 'left',
            }}
          >
            {d}
            {i >= 5 && (
              <span style={{ color: LRH.red, marginLeft: 4 }}>·</span>
            )}
          </div>
        ))}

        {/* Day cells */}
        {grid.map((date) => {
          const k = dayKey(date);
          const inMonth = date.getMonth() === cursor.month;
          const isToday = sameDay(date, today);
          const isSelected = selectedDay && sameDay(date, selectedDay);
          const dayMatches = matchesByDay.get(k) ?? [];
          const hasMatches = dayMatches.length > 0;

          // Dominant mode color for the left accent
          let accentColor: string | null = null;
          if (hasMatches) {
            const hasGazon = dayMatches.some((m) => m.competition.mode === 'GAZON');
            const hasSalle = dayMatches.some((m) => m.competition.mode === 'SALLE');
            if (hasGazon && hasSalle) accentColor = LRH.red;
            else if (hasGazon) accentColor = MODE_COLOR.GAZON.bg;
            else accentColor = MODE_COLOR.SALLE.bg;
          }

          const visible = dayMatches.slice(0, 3);
          const extra = dayMatches.length - visible.length;

          return (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedDay(date)}
              style={{
                position: 'relative',
                minHeight: 108,
                padding: '8px 8px 8px 10px',
                background: inMonth ? '#fff' : LRH.paperWarm,
                border: 'none',
                borderLeft: accentColor ? `3px solid ${accentColor}` : '3px solid transparent',
                outline: isSelected ? `2px solid ${LRH.navy}` : 'none',
                outlineOffset: isSelected ? '-2px' : 0,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontFamily: 'inherit',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    ...display,
                    fontSize: 14,
                    fontWeight: 700,
                    color: inMonth ? LRH.navy : LRH.mute,
                    letterSpacing: '-0.01em',
                    ...(isToday
                      ? {
                          background: LRH.gold,
                          color: LRH.navy,
                          padding: '1px 7px',
                          borderRadius: 2,
                        }
                      : {}),
                  }}
                >
                  {date.getDate()}
                </span>
                {hasMatches && (
                  <span
                    style={{
                      ...mono,
                      fontSize: 9,
                      fontWeight: 700,
                      color: LRH.mute,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {dayMatches.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visible.map((m) => {
                  const pal = MODE_COLOR[m.competition.mode];
                  const time = new Date(m.kickoffAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const ho = m.homeClub.shortCode ?? m.homeClub.name.slice(0, 4).toUpperCase();
                  const aw = m.awayClub.shortCode ?? m.awayClub.name.slice(0, 4).toUpperCase();
                  return (
                    <div
                      key={m.id}
                      style={{
                        ...mono,
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: pal.fg,
                        background: pal.bg,
                        padding: '2px 5px',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${time} · ${m.homeClub.name} vs ${m.awayClub.name}`}
                    >
                      {time} {ho}–{aw}
                    </div>
                  );
                })}
                {extra > 0 && (
                  <div
                    style={{
                      ...mono,
                      fontSize: 9,
                      fontWeight: 700,
                      color: LRH.mute,
                      letterSpacing: '0.06em',
                    }}
                  >
                    +{extra} autre{extra > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Day panel */}
      {selectedDay && !editing && (
        <DayPanel
          date={selectedDay}
          matches={selectedMatches}
          isAdmin={isAdmin}
          clubId={clubId}
          competitionFilter={competitionFilter}
          onCreate={() => openCreate(selectedDay)}
          onEdit={openEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function DayPanel({
  date,
  matches,
  isAdmin,
  clubId,
  competitionFilter,
  onCreate,
  onEdit,
  onDelete,
}: {
  date: Date;
  matches: AdminMatchRow[];
  isAdmin: boolean;
  clubId?: string;
  competitionFilter: string;
  onCreate: () => void;
  onEdit: (m: AdminMatchRow) => void;
  onDelete: (m: AdminMatchRow) => void;
}) {
  const dayLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dateIso = dayKey(date);
  const journeeHref = `/dashboard/matches/journee/new?date=${dateIso}${competitionFilter ? `&competition=${competitionFilter}` : ''}`;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `4px solid ${LRH.navy}`,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              ...mono,
              fontSize: 10.5,
              fontWeight: 700,
              color: LRH.red,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            ▸ Journée sélectionnée
          </div>
          <div
            style={{
              ...display,
              fontSize: 18,
              fontWeight: 700,
              color: LRH.navy,
              letterSpacing: '-0.01em',
              textTransform: 'capitalize',
            }}
          >
            {dayLabel}
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onCreate}
              style={{
                ...body,
                fontSize: 12,
                fontWeight: 700,
                padding: '10px 16px',
                background: LRH.red,
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              + Créer un match
            </button>
            <Link
              href={journeeHref}
              style={{
                ...body,
                fontSize: 12,
                fontWeight: 700,
                padding: '10px 16px',
                background: 'transparent',
                color: LRH.navy,
                border: '1px solid ' + LRH.navy,
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              + Créer la journée
            </Link>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.mute,
            letterSpacing: '0.08em',
            padding: '14px 16px',
            background: LRH.paperWarm,
            border: '1px dashed ' + LRH.hairStrong,
          }}
        >
          Aucun match programmé ce jour.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map((m) => (
            <DayMatchRow
              key={m.id}
              m={m}
              isAdmin={isAdmin}
              clubId={clubId}
              onEdit={() => onEdit(m)}
              onDelete={() => onDelete(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DayMatchRow({
  m,
  isAdmin,
  clubId,
  onEdit,
  onDelete,
}: {
  m: AdminMatchRow;
  isAdmin: boolean;
  clubId?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const pal = MODE_COLOR[m.competition.mode];
  const time = new Date(m.kickoffAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const involves = m.homeClubId === clubId || m.awayClubId === clubId;

  return (
    <div
      style={{
        background: LRH.paperWarm,
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${pal.bg}`,
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: '70px 1fr auto',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{
            ...display,
            fontSize: 18,
            fontWeight: 800,
            color: LRH.navy,
            letterSpacing: '-0.02em',
          }}
        >
          {time}
        </div>
        {m.matchday != null && (
          <div
            style={{
              ...mono,
              fontSize: 9.5,
              fontWeight: 700,
              color: LRH.mute,
              letterSpacing: '0.1em',
              marginTop: 2,
            }}
          >
            J{m.matchday.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}
        >
          <ModeBadge mode={m.competition.mode} size="sm" />
          <span style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>
            {m.competition.season} · {m.competition.name}
          </span>
          <StatusBadge status={m.status} />
          {involves && (
            <span
              style={{
                ...mono,
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                background: LRH.gold,
                color: LRH.navy,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Mon club
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ClubCrest id={m.homeClub.shortCode ?? undefined} size={22} />
          <span style={{ ...display, fontWeight: 700, fontSize: 13, color: LRH.navy }}>
            <span className="lrh-match-team-full">{m.homeClub.name}</span>
            <span className="lrh-match-team-short">
              {m.homeClub.shortCode ?? m.homeClub.name.replace(/^Entente\s+/i, '')}
            </span>
          </span>
          <span style={{ ...display, fontWeight: 800, fontSize: 16, color: LRH.navy, padding: '0 4px' }}>
            {m.homeScore ?? '—'}
            <span style={{ color: LRH.mute, margin: '0 5px' }}>:</span>
            {m.awayScore ?? '—'}
          </span>
          <span style={{ ...display, fontWeight: 700, fontSize: 13, color: LRH.navy }}>
            <span className="lrh-match-team-full">{m.awayClub.name}</span>
            <span className="lrh-match-team-short">
              {m.awayClub.shortCode ?? m.awayClub.name.replace(/^Entente\s+/i, '')}
            </span>
          </span>
          <ClubCrest id={m.awayClub.shortCode ?? undefined} size={22} />
        </div>
        {(m.venueRef || m.venue) && (
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.06em',
              marginTop: 4,
            }}
          >
            ◉ {m.venueRef ? `${m.venueRef.name} · ${m.venueRef.city}` : m.venue}
          </div>
        )}
        {m.organizerClub && (
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.06em',
              marginTop: 3,
            }}
          >
            ⚑ Organisé par {m.organizerClub.name}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Link
          href={`/dashboard/matches/${m.id}`}
          style={{
            ...body,
            fontSize: 11,
            fontWeight: 700,
            padding: '6px 11px',
            background: LRH.navy,
            color: '#fff',
            border: '1px solid ' + LRH.navy,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Détails
        </Link>
        {isAdmin && (
          <button
            type="button"
            onClick={onEdit}
            style={{
              ...body,
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 11px',
              background: 'transparent',
              color: LRH.navy,
              border: '1px solid ' + LRH.navy,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Modifier
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              ...body,
              fontSize: 11,
              fontWeight: 700,
              padding: '6px 11px',
              background: 'transparent',
              color: LRH.red,
              border: '1px solid ' + LRH.red,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Suppr.
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Vue agenda verticale pour mobile : liste des jours du mois avec matchs.
 * On affiche tous les jours, mais on rend visibles seulement ceux qui ont des
 * matchs (les autres sont masqués). Un header sticky par semaine évite de
 * perdre le repère temporel quand on scrolle.
 */
function AgendaView({
  grid,
  today,
  selectedDay,
  matchesByDay,
  onSelectDay,
  monthLabel,
}: {
  grid: Date[];
  today: Date;
  selectedDay: Date | null;
  matchesByDay: Map<string, AdminMatchRow[]>;
  onSelectDay: (d: Date) => void;
  monthLabel: string;
}) {
  // On filtre : jours du mois courant avec au moins 1 match.
  const cursorMonth = grid.find((d) => d.getDate() === 15)?.getMonth();
  const daysWithMatches = useMemo(() => {
    return grid.filter((d) => {
      if (d.getMonth() !== cursorMonth) return false;
      return (matchesByDay.get(dayKey(d)) ?? []).length > 0;
    });
  }, [grid, cursorMonth, matchesByDay]);

  if (daysWithMatches.length === 0) {
    return (
      <div
        style={{
          padding: 28,
          background: '#fff',
          border: '1px dashed ' + LRH.hairStrong,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
          ◌ Aucun match programmé
        </div>
        <div style={{ ...body, fontSize: 13, color: LRH.ink2 }}>
          {monthLabel} ne contient aucun match (selon les filtres actifs).
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: LRH.hair, border: '1px solid ' + LRH.hairStrong, marginBottom: 16 }}>
      {daysWithMatches.map((date) => {
        const k = dayKey(date);
        const dayMatches = matchesByDay.get(k) ?? [];
        const isToday = sameDay(date, today);
        const isSelected = selectedDay && sameDay(date, selectedDay);

        // Couleur accent dominante du jour (gazon/salle/mixte)
        let accentColor = LRH.gold;
        const hasGazon = dayMatches.some((m) => m.competition.mode === 'GAZON');
        const hasSalle = dayMatches.some((m) => m.competition.mode === 'SALLE');
        if (hasGazon && hasSalle) accentColor = LRH.red;
        else if (hasGazon) accentColor = MODE_COLOR.GAZON.bg;
        else if (hasSalle) accentColor = MODE_COLOR.SALLE.bg;

        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelectDay(date)}
            style={{
              background: isSelected ? LRH.paperWarm : '#fff',
              border: 'none',
              borderLeft: `4px solid ${accentColor}`,
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              outline: isSelected ? `2px solid ${LRH.navy}` : 'none',
              outlineOffset: -2,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
              <div>
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    fontWeight: 700,
                    color: isToday ? LRH.red : LRH.mute,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                  }}
                >
                  {date.toLocaleDateString('fr-FR', { weekday: 'long' })}
                  {isToday && <span style={{ color: LRH.red, marginLeft: 6 }}>· Aujourd&apos;hui</span>}
                </div>
                <div
                  style={{
                    ...display,
                    fontWeight: 800,
                    fontSize: 26,
                    color: LRH.navy,
                    letterSpacing: '-0.025em',
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </div>
              </div>
              <div
                style={{
                  ...mono,
                  fontSize: 10,
                  fontWeight: 700,
                  color: LRH.mute,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                {dayMatches.length.toString().padStart(2, '0')} match
                {dayMatches.length > 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {dayMatches.slice(0, 4).map((m) => {
                const pal = MODE_COLOR[m.competition.mode];
                const time = new Date(m.kickoffAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={m.id}
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: LRH.ink2,
                      letterSpacing: '0.04em',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: pal.bg,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flexShrink: 0, fontWeight: 700 }}>{time}</span>
                    <span style={{
                      ...body,
                      fontSize: 12.5,
                      color: LRH.navy,
                      fontWeight: 600,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      minWidth: 0,
                    }}>
                      {m.homeClub.shortCode ?? m.homeClub.name} <span style={{ color: LRH.mute }}>vs</span>{' '}
                      {m.awayClub.shortCode ?? m.awayClub.name}
                    </span>
                  </div>
                );
              })}
              {dayMatches.length > 4 && (
                <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em', marginTop: 2 }}>
                  + {dayMatches.length - 4} autre{dayMatches.length - 4 > 1 ? 's' : ''} match
                  {dayMatches.length - 4 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
