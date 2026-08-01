'use client';

import React, { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import { convertDraftMatchdayToMatches } from '@/lib/actions/draftCalendar';
import { generateRoundRobinPairs } from '@/lib/scheduling/roundRobin';
import { distributePairsOverDays } from '@/lib/scheduling/distribute';

type MatchPhase = 'REGULAR' | 'R32' | 'R16' | 'QUARTER' | 'SEMI' | 'THIRD_PLACE' | 'FINAL';

const PHASE_OPTIONS: { value: MatchPhase; label: string }[] = [
  { value: 'REGULAR', label: 'Phase régulière' },
  { value: 'QUARTER', label: 'Quart de finale' },
  { value: 'SEMI', label: 'Demi-finale' },
  { value: 'THIRD_PLACE', label: 'Match 3e place' },
  { value: 'FINAL', label: 'Finale' },
];

export type SlotForConversion = {
  id: string;
  date: string;
  matchday: number;
  slotIndex: number;
  competitionId: string;
  competitionName: string;
  competitionDoubleRound: boolean;
  competitionFairnessEnabled: boolean;
  /**
   * Affiche issue du tirage de la compétition, si elle a été tirée. C'est la
   * valeur par défaut du formulaire : l'admin n'a plus qu'à valider.
   */
  plannedHomeClubId?: string | null;
  plannedAwayClubId?: string | null;
};

export type ClubOption = {
  id: string;
  name: string;
  shortCode: string | null;
};

export type VenueOption = {
  id: string;
  name: string;
  city: string | null;
};

export type RefereeOption = {
  id: string;
  fullName: string;
};

type Row = {
  slotId: string;
  homeClubId: string;
  awayClubId: string;
  time: string;
  venueId: string;
  phase: MatchPhase;
  refereeIds: string[];
};

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
  padding: '8px 10px',
  border: `1px solid ${LRH.hairStrong}`,
  background: '#fff',
  color: LRH.ink,
  minHeight: 36,
  width: '100%',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  ...mono,
  fontSize: 11,
  fontWeight: 700,
  padding: '12px 20px',
  background: LRH.navy,
  color: '#fff',
  border: 'none',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  minHeight: 44,
};

const btnGhost = (color: string): React.CSSProperties => ({
  ...mono,
  fontSize: 11,
  fontWeight: 700,
  padding: '10px 16px',
  background: 'transparent',
  color,
  border: `1px solid ${color}`,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  minHeight: 44,
});

export function ConvertMatchdayModal({
  draftCalendarId,
  matchday,
  dateLabel,
  slots,
  clubs,
  venues,
  referees,
  entriesByCompetition,
  onClose,
}: {
  draftCalendarId: string;
  matchday: number;
  dateLabel: string;
  slots: SlotForConversion[];
  clubs: ClubOption[];
  venues: VenueOption[];
  referees: RefereeOption[];
  entriesByCompetition: Map<string, Set<string>>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Initial rows : un par slot, pré-remplis avec l'affiche issue du tirage de
  // la compétition quand elle existe. Heure par défaut espacée de 2h à 14h.
  const [rows, setRows] = useState<Row[]>(() =>
    slots.map((s, i) => ({
      slotId: s.id,
      homeClubId: s.plannedHomeClubId ?? '',
      awayClubId: s.plannedAwayClubId ?? '',
      time: defaultTime(i),
      venueId: '',
      phase: 'REGULAR' as MatchPhase,
      refereeIds: [],
    })),
  );

  const sortedSlots = [...slots].sort((a, b) => a.slotIndex - b.slotIndex);

  // Si toutes les paires concernent la même compétition, on peut proposer
  // un tirage automatique à partir des équipes inscrites.
  const competitionsInDay = [...new Set(slots.map((s) => s.competitionId))];
  const singleComp = competitionsInDay.length === 1 ? slots[0] : null;
  const eligibleClubIds = singleComp
    ? Array.from(entriesByCompetition.get(singleComp.competitionId) ?? [])
    : [];

  const clubById = useMemo(() => {
    const m = new Map<string, ClubOption>();
    for (const c of clubs) m.set(c.id, c);
    return m;
  }, [clubs]);

  // Y a-t-il un tirage de compétition à reprendre pour cette journée ?
  const hasPlanned = slots.some((s) => s.plannedHomeClubId && s.plannedAwayClubId);

  const handleAutoDraw = () => {
    setError('');

    // Cas normal : la compétition a été tirée au sort sur l'ensemble du
    // calendrier. On restaure simplement ce qui a été décidé là-bas — c'est
    // le seul chemin qui garantit la cohérence d'une journée à l'autre.
    if (hasPlanned) {
      setRows((prev) =>
        prev.map((row) => {
          const s = slots.find((x) => x.id === row.slotId);
          if (!s?.plannedHomeClubId || !s.plannedAwayClubId) return row;
          return { ...row, homeClubId: s.plannedHomeClubId, awayClubId: s.plannedAwayClubId };
        }),
      );
      return;
    }

    // Repli : aucun tirage global n'a été fait. On tire cette journée seule.
    // Attention, ce tirage ignore les autres journées : il peut reproduire une
    // affiche déjà programmée ailleurs. Le tirage de la compétition, depuis le
    // calendrier, est toujours préférable.
    if (!singleComp) {
      setError('Le tirage d\'une journée seule ne fonctionne que si tous les créneaux concernent une même compétition. Utilisez le tirage de la compétition depuis le calendrier.');
      return;
    }
    if (eligibleClubIds.length < 2) {
      setError('Pas assez d\'équipes inscrites à cette compétition pour un tirage.');
      return;
    }

    const pairs = generateRoundRobinPairs(eligibleClubIds, { doubleRound: false }).flat();
    const [day] = distributePairsOverDays(
      pairs,
      [{
        date: sortedSlots[0]?.date ?? '',
        matchday,
        slotIds: sortedSlots.map((s) => s.id),
        fixed: sortedSlots.map(() => null),
      }],
      { seed: Date.now() % 2 ** 31 },
    ).days;

    const bySlot = new Map(day?.assignments.map((a) => [a.slotId, a.pair]) ?? []);
    setRows((prev) =>
      prev.map((row) => {
        const pair = bySlot.get(row.slotId);
        if (!pair) return row;
        return { ...row, homeClubId: pair.home, awayClubId: pair.away };
      }),
    );
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  };

  const handleSubmit = () => {
    setError('');

    // Validation côté client : tous les rows doivent avoir home, away (différents), heure.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.homeClubId || !r.awayClubId) {
        setError(`Créneau ${i + 1} : choisissez les deux équipes.`);
        return;
      }
      if (r.homeClubId === r.awayClubId) {
        setError(`Créneau ${i + 1} : domicile et visiteur doivent être différents.`);
        return;
      }
      if (!/^\d{2}:\d{2}$/.test(r.time)) {
        setError(`Créneau ${i + 1} : heure invalide.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await convertDraftMatchdayToMatches({
          draftCalendarId,
          matchday,
          items: rows.map((r) => ({
            slotId: r.slotId,
            homeClubId: r.homeClubId,
            awayClubId: r.awayClubId,
            time: r.time,
            venueId: r.venueId || null,
            phase: r.phase,
            refereeIds: r.refereeIds,
          })),
        });
        router.refresh();
        onClose();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur lors de la conversion');
      }
    });
  };

  // Overlay click → close (mais pas si on clique dans la modale)
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 20, zIndex: 50, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', maxWidth: 920, width: '100%',
          marginTop: 40, marginBottom: 40,
          borderLeft: `4px solid ${LRH.gold}`,
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${LRH.hair}` }}>
          <div style={{
            ...mono, fontSize: 10, fontWeight: 700, color: LRH.red,
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6,
          }}>
            Conversion · Journée {matchday}
          </div>
          <div style={{ ...display, fontSize: 22, fontWeight: 700, color: LRH.navy, letterSpacing: '-0.02em' }}>
            Convertir en matchs officiels
          </div>
          <div style={{ ...body, fontSize: 13, color: LRH.mute, marginTop: 6 }}>
            {dateLabel} — {slots.length} créneau{slots.length > 1 ? 'x' : ''} à remplir.
            {singleComp && (
              <> Compétition : <strong style={{ color: LRH.ink2 }}>{singleComp.competitionName}</strong>.</>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {error && (
            <div style={{
              ...body, fontSize: 13, color: LRH.red, marginBottom: 16,
              padding: '10px 14px', background: 'rgba(168,32,47,0.06)',
              border: `1px solid ${LRH.red}`,
            }}>
              {error}
            </div>
          )}

          {/* Action bar : reprise du tirage, ou repli sur un tirage local */}
          {(hasPlanned || (singleComp && eligibleClubIds.length >= 2)) && (
            <div style={{
              display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
              marginBottom: 16, padding: 12,
              background: hasPlanned ? 'rgba(29,107,63,0.08)' : 'rgba(243,188,28,0.08)',
              border: `1px dashed ${hasPlanned ? '#1d6b3f' : LRH.gold}`,
            }}>
              <span style={{ ...body, fontSize: 12, color: LRH.ink, flex: '1 1 260px', lineHeight: 1.45 }}>
                {hasPlanned ? (
                  <>
                    Les affiches ci-dessous viennent du <strong>tirage de la compétition</strong>.
                    Vous pouvez les modifier avant de convertir.
                  </>
                ) : (
                  <>
                    {eligibleClubIds.length} équipes inscrites. Cette journée n&apos;a pas encore été tirée au sort.
                    Pour une répartition cohérente sur toute la saison, lancez plutôt le tirage de la
                    compétition depuis le calendrier.
                  </>
                )}
              </span>
              <button
                onClick={handleAutoDraw}
                style={{ ...btnGhost(hasPlanned ? '#1d6b3f' : LRH.navy), minHeight: 48 }}
              >
                {hasPlanned ? '↺ Rétablir le tirage' : '◎ Tirer cette journée'}
              </button>
            </div>
          )}

          {/* Table (en-tête + rangées) — scroll horizontal sous ~600px :
              les 6 colonnes ne tiennent pas dans la largeur mobile du modal. */}
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 600 }}>
          {/* Table headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 1fr 90px 1fr 120px',
            gap: 8,
            ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            paddingBottom: 8, borderBottom: `1px solid ${LRH.hair}`,
            marginBottom: 10,
          }}>
            <div>#</div>
            <div>Domicile</div>
            <div>Visiteur</div>
            <div>Heure</div>
            <div>Lieu</div>
            <div>Phase</div>
          </div>

          {/* Rows */}
          {sortedSlots.map((slot, i) => {
            const row = rows[i];
            const sameCompClubs = clubs.filter((c) => {
              const set = entriesByCompetition.get(slot.competitionId);
              return !set || set.size === 0 || set.has(c.id);
            });
            return (
              <div
                key={slot.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr 90px 1fr 120px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: `1px solid rgba(10,18,32,0.04)`,
                }}
              >
                <div style={{ ...mono, fontSize: 11, fontWeight: 700, color: LRH.navy }}>
                  {i + 1}
                </div>
                <select
                  value={row.homeClubId}
                  onChange={(e) => updateRow(i, { homeClubId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">—</option>
                  {sameCompClubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.shortCode ?? c.name}</option>
                  ))}
                </select>
                <select
                  value={row.awayClubId}
                  onChange={(e) => updateRow(i, { awayClubId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">—</option>
                  {sameCompClubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.shortCode ?? c.name}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={row.time}
                  onChange={(e) => updateRow(i, { time: e.target.value })}
                  style={inputStyle}
                />
                <select
                  value={row.venueId}
                  onChange={(e) => updateRow(i, { venueId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">— Lieu —</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}{v.city ? ` (${v.city})` : ''}
                    </option>
                  ))}
                </select>
                <select
                  value={row.phase}
                  onChange={(e) => updateRow(i, { phase: e.target.value as MatchPhase })}
                  style={inputStyle}
                >
                  {PHASE_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
          </div>
          </div>

          {/* Warning back-to-back */}
          <BackToBackWarning rows={rows} clubById={clubById} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${LRH.hair}`,
          background: LRH.paper,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button onClick={onClose} disabled={isPending} style={btnGhost(LRH.mute)}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={isPending} style={{ ...btnPrimary, opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Conversion…' : '✓ Convertir en matchs'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackToBackWarning({ rows, clubById }: { rows: Row[]; clubById: Map<string, ClubOption> }) {
  const warnings: string[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    for (const id of [r.homeClubId, r.awayClubId]) {
      if (!id) continue;
      const prev = seen.get(id);
      if (prev != null && prev === i - 1) {
        const club = clubById.get(id);
        warnings.push(`Créneau ${i + 1} : ${club?.shortCode ?? club?.name ?? id} enchaîne 2 matchs (back-to-back).`);
      }
      seen.set(id, i);
    }
  }
  if (warnings.length === 0) return null;
  return (
    <div style={{
      marginTop: 12, padding: 12,
      background: 'rgba(243,188,28,0.08)',
      border: `1px solid ${LRH.gold}`,
    }}>
      <div style={{
        ...mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: LRH.navy, marginBottom: 6,
      }}>
        ⚠ Attention back-to-back
      </div>
      {warnings.map((w, i) => (
        <div key={i} style={{ ...body, fontSize: 12, color: LRH.ink2 }}>{w}</div>
      ))}
    </div>
  );
}

function defaultTime(i: number): string {
  const h = 14 + i * 2;
  return `${String(h).padStart(2, '0')}:00`;
}
