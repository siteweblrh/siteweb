'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge } from '@/components/lrh/Badge';
import {
  createMatchday,
  type ClubForAdmin,
  type CompetitionAdminRow,
} from '@/lib/actions/competition';
import type { VenueAdminRow } from '@/lib/queries/venue';

type MatchPhase =
  | 'REGULAR'
  | 'R32'
  | 'R16'
  | 'QUARTER'
  | 'SEMI'
  | 'THIRD_PLACE'
  | 'FINAL';

type MatchRow = {
  homeClubId: string;
  awayClubId: string;
  time: string; // HH:mm
  venueId: string;
  phase: MatchPhase;
};

const EMPTY_ROW = (defaults?: Partial<MatchRow>): MatchRow => ({
  homeClubId: defaults?.homeClubId ?? '',
  awayClubId: defaults?.awayClubId ?? '',
  time: defaults?.time ?? '14:00',
  venueId: defaults?.venueId ?? '',
  phase: defaults?.phase ?? 'REGULAR',
});

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        ...mono,
        fontSize: 10,
        fontWeight: 700,
        color: LRH.mute,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
  padding: '9px 11px',
  width: '100%',
  border: '1px solid ' + LRH.hairStrong,
  borderRadius: 4,
  background: '#fff',
  color: LRH.ink,
};

const btnPrimary: React.CSSProperties = {
  ...body,
  fontSize: 12.5,
  fontWeight: 700,
  padding: '12px 20px',
  borderRadius: 4,
  background: LRH.navy,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const btnGhost: React.CSSProperties = {
  ...body,
  fontSize: 12.5,
  fontWeight: 700,
  padding: '12px 18px',
  borderRadius: 4,
  background: 'transparent',
  color: LRH.mute,
  border: '1px solid ' + LRH.hairStrong,
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

export function MatchdayForm({
  competitions,
  clubs,
  venues,
  entriesByCompetition,
  initialCompetitionId,
  initialMatchday,
  initialDate,
}: {
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
  venues: VenueAdminRow[];
  entriesByCompetition: Record<string, string[]>;
  initialCompetitionId: string;
  initialMatchday: string;
  initialDate: string;
}) {
  const router = useRouter();
  const [competitionId, setCompetitionId] = useState(initialCompetitionId);
  const [matchday, setMatchday] = useState(initialMatchday);
  const [date, setDate] = useState(initialDate);
  const [organizerClubId, setOrganizerClubId] = useState('');
  const [rows, setRows] = useState<MatchRow[]>([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === competitionId),
    [competitions, competitionId],
  );
  const mode = selectedCompetition?.mode;

  const eligibleClubs = useMemo(() => {
    if (!competitionId) return clubs;
    const ids = entriesByCompetition[competitionId] ?? [];
    if (ids.length === 0) return clubs;
    const set = new Set(ids);
    return clubs.filter((c) => set.has(c.id));
  }, [clubs, competitionId, entriesByCompetition]);

  const eligibleVenues = useMemo(() => {
    if (!mode) return venues;
    return venues.filter((v) => (mode === 'GAZON' ? v.supportsGazon : v.supportsSalle));
  }, [venues, mode]);

  // Pré-remplit le nb de lignes selon nb d'équipes inscrites (⌈N/2⌉),
  // mais uniquement à la 1ʳᵉ sélection de compétition pour ne pas écraser
  // le travail en cours.
  const [autoPrefilledFor, setAutoPrefilledFor] = useState<string | null>(null);
  useEffect(() => {
    if (!competitionId || autoPrefilledFor === competitionId) return;
    const ids = entriesByCompetition[competitionId] ?? [];
    if (ids.length < 2) return;
    const suggested = Math.ceil(ids.length / 2);
    if (suggested > 1) {
      setRows(Array.from({ length: suggested }, () => EMPTY_ROW()));
    }
    setAutoPrefilledFor(competitionId);
  }, [competitionId, entriesByCompetition, autoPrefilledFor]);

  const updateRow = (idx: number, patch: Partial<MatchRow>) => {
    setRows((rs) => {
      const next = rs.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      // Auto venue suggestion when home is picked
      if (patch.homeClubId && mode) {
        const home = clubs.find((c) => c.id === patch.homeClubId);
        const suggested = mode === 'GAZON' ? home?.homeVenueGazonId : home?.homeVenueSalleId;
        if (suggested && !next[idx].venueId) {
          next[idx] = { ...next[idx], venueId: suggested };
        }
      }
      return next;
    });
  };

  const addRow = () => setRows((rs) => [...rs, EMPTY_ROW()]);
  const removeRow = (idx: number) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs));

  const submit = async () => {
    if (!competitionId) return setError('Choisissez une compétition.');
    if (!matchday || Number(matchday) < 1) return setError('Numéro de journée requis (≥ 1).');
    if (!date) return setError('Date de la journée requise.');

    const filled = rows.filter((r) => r.homeClubId || r.awayClubId);
    if (filled.length === 0) return setError('Ajoutez au moins un match.');
    for (const r of filled) {
      if (!r.homeClubId || !r.awayClubId) return setError('Chaque match doit avoir un domicile et un visiteur.');
      if (r.homeClubId === r.awayClubId) return setError('Domicile et visiteur doivent être différents pour chaque match.');
      if (!/^\d{2}:\d{2}$/.test(r.time)) return setError('Heure invalide (format HH:mm).');
    }

    setSaving(true);
    setError(null);
    try {
      const res = await createMatchday({
        competitionId,
        matchday: Number(matchday),
        date,
        organizerClubId: organizerClubId || null,
        matches: filled.map((r) => ({
          homeClubId: r.homeClubId,
          awayClubId: r.awayClubId,
          time: r.time,
          venueId: r.venueId || null,
          phase: r.phase,
        })),
      });
      router.push(`/dashboard/matches/calendar?focus=${date}`);
      router.refresh();
      // notification basic
      console.info(`[createMatchday] ${res.count} match(s) créé(s)`);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la création de la journée.');
    } finally {
      setSaving(false);
    }
  };

  const entriesCount = competitionId ? (entriesByCompetition[competitionId]?.length ?? 0) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Section header */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `4px solid ${LRH.red}`,
          padding: 22,
        }}
      >
        <div
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            color: LRH.red,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          ▸ Cadre de la journée
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <FieldLabel>Compétition *</FieldLabel>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={competitionId}
              onChange={(e) => setCompetitionId(e.target.value)}
            >
              <option value="">— Choisir une compétition —</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.season} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'} · {c.category} · {c.name}
                </option>
              ))}
            </select>
            {selectedCompetition && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <ModeBadge mode={selectedCompetition.mode} size="sm" />
                <CategoryBadge category={selectedCompetition.category} size="sm" />
                <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.06em' }}>
                  {selectedCompetition.season} · {entriesCount} équipe{entriesCount > 1 ? 's' : ''} inscrite{entriesCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          <div>
            <FieldLabel>Journée *</FieldLabel>
            <input
              type="number"
              min={1}
              style={inputStyle}
              value={matchday}
              onChange={(e) => setMatchday(e.target.value)}
              placeholder="3"
            />
          </div>
          <div>
            <FieldLabel>Date *</FieldLabel>
            <input
              type="date"
              style={inputStyle}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Équipe responsable logistique</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={organizerClubId}
            onChange={(e) => setOrganizerClubId(e.target.value)}
          >
            <option value="">— Aucune (à définir plus tard) —</option>
            {eligibleClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.shortCode ? `(${c.shortCode})` : ''}
              </option>
            ))}
          </select>
          {!competitionId && (
            <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.08em', marginTop: 6 }}>
              Sélectionnez d'abord une compétition pour filtrer les clubs inscrits.
            </div>
          )}
        </div>
      </div>

      {/* Section matchs */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `4px solid ${LRH.navy}`,
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              color: LRH.navy,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            ▸ Matchs de la journée ({rows.length})
          </div>
          <button
            type="button"
            onClick={addRow}
            style={{
              ...body,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '7px 12px',
              borderRadius: 4,
              background: 'transparent',
              color: LRH.navy,
              border: '1px solid ' + LRH.navy,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            + Ajouter un match
          </button>
        </div>

        {!competitionId && (
          <div
            style={{
              padding: 14,
              background: 'rgba(243,188,28,0.08)',
              border: '1px dashed ' + LRH.gold,
              ...mono,
              fontSize: 11,
              color: LRH.ink2,
              letterSpacing: '0.06em',
              marginBottom: 14,
            }}
          >
            Sélectionnez une compétition ci-dessus pour activer le choix des équipes et terrains.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '36px 2fr 2fr 90px 1.6fr 36px',
                gap: 8,
                alignItems: 'center',
                padding: 10,
                background: LRH.paperWarm,
                border: '1px solid ' + LRH.hair,
              }}
            >
              <div
                style={{
                  ...mono,
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: LRH.mute,
                  letterSpacing: '0.1em',
                  textAlign: 'center',
                }}
              >
                #{idx + 1}
              </div>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={row.homeClubId}
                onChange={(e) => updateRow(idx, { homeClubId: e.target.value })}
                disabled={!competitionId}
              >
                <option value="">— Domicile —</option>
                {eligibleClubs.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === row.awayClubId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={row.awayClubId}
                onChange={(e) => updateRow(idx, { awayClubId: e.target.value })}
                disabled={!competitionId}
              >
                <option value="">— Visiteur —</option>
                {eligibleClubs.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.id === row.homeClubId}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="time"
                style={inputStyle}
                value={row.time}
                onChange={(e) => updateRow(idx, { time: e.target.value })}
              />
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={row.venueId}
                onChange={(e) => updateRow(idx, { venueId: e.target.value })}
                disabled={!competitionId || eligibleVenues.length === 0}
              >
                <option value="">— Terrain —</option>
                {eligibleVenues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.city}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
                title={rows.length <= 1 ? 'Au moins un match requis' : 'Retirer cette ligne'}
                style={{
                  ...mono,
                  fontSize: 14,
                  fontWeight: 800,
                  padding: '7px 0',
                  borderRadius: 4,
                  background: 'transparent',
                  color: rows.length <= 1 ? LRH.hairStrong : LRH.red,
                  border: '1px solid ' + (rows.length <= 1 ? LRH.hairStrong : LRH.red),
                  cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11.5,
            color: LRH.red,
            padding: '10px 14px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={submit} disabled={saving} style={btnPrimary}>
          {saving ? 'Création…' : 'Créer la journée'}
        </button>
        <Link href="/dashboard/matches/calendar" style={btnGhost}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
