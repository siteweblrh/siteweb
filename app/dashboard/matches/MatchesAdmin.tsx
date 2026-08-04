'use client';

import React, { useEffect, useMemo, useOptimistic, useState, useTransition } from 'react';
import { sideName } from '@/lib/utils/match-side';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SeasonFilter, ALL_SEASONS, seasonsOf } from '@/components/lrh/dashboard/SeasonFilter';
import { LRH, body, display, mono, ClubCrest, MODE_COLOR } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge, StatusBadge } from '@/components/lrh/Badge';
import { Paginator } from '@/components/lrh/sections';
import {
  createMatch,
  updateMatch,
  deleteMatch,
  type AdminMatchRow,
  type ClubForAdmin,
  type CompetitionAdminRow,
} from '@/lib/actions/competition';
import {
  listMatchNotes,
  createMatchNote,
  deleteMatchNote,
  type MatchNoteRow,
} from '@/lib/actions/matchNote';
import type { VenueAdminRow } from '@/lib/queries/venue';
import type { RefereeAdminRow } from '@/lib/queries/referee';
import {
  parseReunionDatetimeLocal,
  toReunionDatetimeLocal,
  formatReunionDate,
  formatReunionTime,
} from '@/lib/utils/datetime-reunion';
import { compactClubLabel } from '@/lib/utils/club-label';
import { allowedPhasesForFormat } from '@/lib/utils/match-phase';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';

type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HALFTIME'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED';

type RefereeRole = 'PRINCIPAL' | 'DELEGUE';

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Programmé' },
  { value: 'LIVE', label: 'En cours' },
  { value: 'HALFTIME', label: 'Mi-temps' },
  { value: 'FINISHED', label: 'Terminé' },
  { value: 'POSTPONED', label: 'Reporté' },
  { value: 'CANCELLED', label: 'Annulé' },
];

type RefereeAssignment = { refereeId: string; role: RefereeRole };

type MatchPhase =
  | 'REGULAR'
  | 'R32'
  | 'R16'
  | 'QUARTER'
  | 'SEMI'
  | 'THIRD_PLACE'
  | 'FINAL';

const PHASE_LABEL: Record<MatchPhase, string> = {
  REGULAR: 'Phase régulière',
  R32: '32e de finale',
  R16: '16e de finale',
  QUARTER: 'Quart de finale',
  SEMI: 'Demi-finale',
  THIRD_PLACE: 'Match 3e place',
  FINAL: 'Finale',
};

const PHASE_ORDER: MatchPhase[] = [
  'REGULAR',
  'R32',
  'R16',
  'QUARTER',
  'SEMI',
  'THIRD_PLACE',
  'FINAL',
];

type SortMode = 'recent-first' | 'oldest-first' | 'by-competition' | 'by-month';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent-first',   label: 'Récents → anciens' },
  { value: 'oldest-first',   label: 'Anciens → récents' },
  { value: 'by-competition', label: 'Par compétition' },
  { value: 'by-month',       label: 'Par mois' },
];

export type FormState = {
  id?: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  kickoffAt: string; // datetime-local string
  venueId: string;
  matchday: string;
  phase: MatchPhase;
  // '' = match simple (leg = null), '1' = aller, '2' = retour.
  leg: string;
  status: MatchStatus;
  homeScore: string;
  awayScore: string;
  organizerClubId: string;
  referees: RefereeAssignment[];
};

export const EMPTY_FORM = (defaults?: Partial<FormState>): FormState => ({
  competitionId: defaults?.competitionId ?? '',
  homeClubId: defaults?.homeClubId ?? '',
  awayClubId: defaults?.awayClubId ?? '',
  kickoffAt: defaults?.kickoffAt ?? '',
  venueId: defaults?.venueId ?? '',
  matchday: defaults?.matchday ?? '',
  phase: defaults?.phase ?? 'REGULAR',
  leg: defaults?.leg ?? '',
  status: defaults?.status ?? 'SCHEDULED',
  homeScore: defaults?.homeScore ?? '',
  awayScore: defaults?.awayScore ?? '',
  organizerClubId: defaults?.organizerClubId ?? '',
  referees: defaults?.referees ?? [],
});

const toDatetimeLocal = toReunionDatetimeLocal;

export function rowToForm(m: AdminMatchRow): FormState {
  return {
    id: m.id,
    competitionId: m.competition.id,
    homeClubId: m.homeClubId ?? '',
    awayClubId: m.awayClubId ?? '',
    kickoffAt: toDatetimeLocal(m.kickoffAt),
    venueId: m.venueId ?? '',
    matchday: m.matchday != null ? String(m.matchday) : '',
    phase: (m as { phase?: MatchPhase }).phase ?? 'REGULAR',
    leg: (m as { leg?: number | null }).leg != null ? String((m as { leg?: number | null }).leg) : '',
    status: m.status as MatchStatus,
    homeScore: m.homeScore != null ? String(m.homeScore) : '',
    awayScore: m.awayScore != null ? String(m.awayScore) : '',
    organizerClubId: m.organizerClubId ?? '',
    referees: m.referees.map((r) => ({
      refereeId: r.referee.id,
      role: r.role as RefereeRole,
    })),
  };
}

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
  fontSize: 14,
  padding: '10px 12px',
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
  padding: '10px 18px',
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
  padding: '10px 18px',
  borderRadius: 4,
  background: 'transparent',
  color: LRH.mute,
  border: '1px solid ' + LRH.hairStrong,
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

export function MatchForm({
  initial,
  competitions,
  clubs,
  venues,
  referees,
  entriesByCompetition,
  isAdmin,
  onCancel,
  onDone,
}: {
  initial: FormState;
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
  venues: VenueAdminRow[];
  referees: RefereeAdminRow[];
  entriesByCompetition: Record<string, string[]>;
  isAdmin: boolean;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial.id);

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === form.competitionId),
    [competitions, form.competitionId],
  );

  const mode = selectedCompetition?.mode;

  // Phases autorisées selon le format de la compétition. Un championnat pur ne
  // propose que « Phase régulière » : une phase finale y créerait un match
  // invisible (cf. lib/utils/match-phase.ts). Source unique = le helper.
  const allowedPhases = useMemo(
    () => allowedPhasesForFormat(selectedCompetition?.format),
    [selectedCompetition?.format],
  );
  const phaseLocked = allowedPhases.length === 1;

  // Si on change de compétition vers un format plus restrictif alors qu'une
  // phase finale était sélectionnée, on rebascule sur REGULAR.
  useEffect(() => {
    if (!allowedPhases.includes(form.phase)) {
      setForm((f) => ({ ...f, phase: 'REGULAR' }));
    }
  }, [allowedPhases, form.phase]);

  // Clubs éligibles : ceux inscrits à la compétition. Si aucune inscription,
  // mode permissif (rétrocompat) — tous les clubs sont éligibles.
  const eligibleClubs = useMemo(() => {
    if (!form.competitionId) return clubs;
    const entryIds = entriesByCompetition[form.competitionId] ?? [];
    if (entryIds.length === 0) return clubs;
    const set = new Set(entryIds);
    return clubs.filter((c) => set.has(c.id));
  }, [clubs, form.competitionId, entriesByCompetition]);

  // Venues filtrés par mode de la compétition sélectionnée
  const eligibleVenues = useMemo(() => {
    if (!mode) return venues;
    return venues.filter((v) =>
      mode === 'GAZON' ? v.supportsGazon : v.supportsSalle,
    );
  }, [venues, mode]);

  // Auto-suggestion du venue à la création : home venue du club domicile pour ce mode
  const homeClub = useMemo(
    () => clubs.find((c) => c.id === form.homeClubId),
    [clubs, form.homeClubId],
  );
  const suggestedVenueId = useMemo(() => {
    if (!homeClub || !mode) return null;
    return mode === 'GAZON' ? homeClub.homeVenueGazonId : homeClub.homeVenueSalleId;
  }, [homeClub, mode]);

  // Quand on crée un match et qu'on choisit le home club, on pré-remplit le venue
  React.useEffect(() => {
    if (isEdit) return;
    if (form.venueId) return;
    if (suggestedVenueId) {
      setForm((f) => ({ ...f, venueId: suggestedVenueId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedVenueId, isEdit]);

  const addReferee = (role: RefereeRole) => {
    setForm({ ...form, referees: [...form.referees, { refereeId: '', role }] });
  };

  const updateRefereeAt = (index: number, refereeId: string) => {
    const next = form.referees.map((r, i) => (i === index ? { ...r, refereeId } : r));
    setForm({ ...form, referees: next });
  };

  const removeRefereeAt = (index: number) => {
    setForm({ ...form, referees: form.referees.filter((_, i) => i !== index) });
  };

  const principalsCount = form.referees.filter((r) => r.role === 'PRINCIPAL').length;
  const deleguesCount = form.referees.filter((r) => r.role === 'DELEGUE').length;

  const submit = async () => {
    if (!form.competitionId) {
      setError('Choisissez une compétition.');
      return;
    }
    if (!form.homeClubId || !form.awayClubId) {
      setError('Choisissez les deux équipes.');
      return;
    }
    if (form.homeClubId === form.awayClubId) {
      setError('Le club domicile et le visiteur doivent être différents.');
      return;
    }
    if (!form.kickoffAt) {
      setError('Date et heure du coup d\'envoi requises.');
      return;
    }
    // Aucun arbitre avec ID vide (l'utilisateur n'a pas terminé son choix)
    if (form.referees.some((r) => !r.refereeId)) {
      setError('Sélectionnez un arbitre pour chaque ligne, ou retirez la ligne.');
      return;
    }
    // Doublons d'arbitres
    const refIds = form.referees.map((r) => r.refereeId);
    if (new Set(refIds).size !== refIds.length) {
      setError('Un arbitre est affecté plusieurs fois — chaque arbitre ne peut apparaître qu\'une fois par match.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const matchday = form.matchday.trim() === '' ? null : Number(form.matchday);
      const homeScore = form.homeScore.trim() === '' ? null : Number(form.homeScore);
      const awayScore = form.awayScore.trim() === '' ? null : Number(form.awayScore);
      const leg = form.leg === '1' ? 1 : form.leg === '2' ? 2 : null;

      if (isEdit && initial.id) {
        await updateMatch(initial.id, {
          ...(isAdmin ? { homeClubId: form.homeClubId, awayClubId: form.awayClubId } : {}),
          kickoffAt: parseReunionDatetimeLocal(form.kickoffAt),
          venueId: form.venueId || null,
          matchday,
          phase: form.phase,
          leg,
          status: form.status,
          homeScore,
          awayScore,
          ...(isAdmin ? { organizerClubId: form.organizerClubId || null } : {}),
          ...(isAdmin ? { referees: form.referees } : {}),
        });
      } else {
        await createMatch({
          competitionId: form.competitionId,
          homeClubId: form.homeClubId,
          awayClubId: form.awayClubId,
          kickoffAt: parseReunionDatetimeLocal(form.kickoffAt),
          venueId: form.venueId || null,
          matchday: matchday ?? null,
          phase: form.phase,
          leg,
          status: form.status,
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
          organizerClubId: form.organizerClubId || null,
          referees: form.referees,
        });
      }
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onCancel}
      busy={saving}
      size="wide"
      title={isEdit ? 'Modifier le match' : 'Nouveau match'}
      footer={
        <>
          <button onClick={onCancel} disabled={saving} style={btnGhost}>
            Annuler
          </button>
          <button onClick={submit} disabled={saving} style={btnPrimary}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >

      {/* Compétition */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Compétition *</FieldLabel>
        <select
          style={{ ...inputStyle, cursor: isEdit ? 'not-allowed' : 'pointer' }}
          value={form.competitionId}
          disabled={isEdit}
          onChange={(e) => setForm({ ...form, competitionId: e.target.value })}
        >
          <option value="">— Choisir une compétition —</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.season} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'} · {c.category} · {c.name}
            </option>
          ))}
        </select>
        {selectedCompetition && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <ModeBadge mode={selectedCompetition.mode} size="sm" />
            <CategoryBadge category={selectedCompetition.category} size="sm" />
            <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.06em' }}>
              {selectedCompetition.season}
            </span>
          </div>
        )}
        {isEdit && (
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.08em',
              marginTop: 6,
            }}
          >
            La compétition ne peut pas être modifiée après création — supprimez et recréez le match si besoin.
          </div>
        )}
        {form.competitionId && (entriesByCompetition[form.competitionId]?.length ?? 0) === 0 && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'rgba(243,188,28,0.08)',
              border: '1px dashed ' + LRH.gold,
              ...mono,
              fontSize: 10.5,
              color: LRH.ink2,
              letterSpacing: '0.06em',
            }}
          >
            ⚠ Aucune équipe n'est encore inscrite à cette compétition. Tous les clubs sont autorisés pour l'instant — pensez à déclarer les inscriptions dans Compétitions → Inscrits.
          </div>
        )}
      </div>

      {/* Équipes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Club domicile *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.homeClubId}
            disabled={isEdit && !isAdmin}
            onChange={(e) => setForm({ ...form, homeClubId: e.target.value })}
          >
            <option value="">— Choisir —</option>
            {eligibleClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.shortCode ? `(${c.shortCode})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Club visiteur *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.awayClubId}
            disabled={isEdit && !isAdmin}
            onChange={(e) => setForm({ ...form, awayClubId: e.target.value })}
          >
            <option value="">— Choisir —</option>
            {eligibleClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.shortCode ? `(${c.shortCode})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date / journée */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <FieldLabel>Coup d'envoi *</FieldLabel>
          <input
            type="datetime-local"
            style={inputStyle}
            value={form.kickoffAt}
            onChange={(e) => setForm({ ...form, kickoffAt: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Journée</FieldLabel>
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={form.matchday}
            onChange={(e) => setForm({ ...form, matchday: e.target.value })}
            placeholder="3"
          />
        </div>
        <div>
          <FieldLabel>Phase</FieldLabel>
          <select
            style={{
              ...inputStyle,
              cursor: phaseLocked ? 'not-allowed' : 'pointer',
              background: phaseLocked ? LRH.paperWarm : '#fff',
              color: phaseLocked ? LRH.mute : LRH.ink,
            }}
            value={form.phase}
            disabled={phaseLocked}
            onChange={(e) => setForm({ ...form, phase: e.target.value as MatchPhase })}
          >
            {PHASE_ORDER.filter((p) => allowedPhases.includes(p)).map((p) => (
              <option key={p} value={p}>{PHASE_LABEL[p]}</option>
            ))}
          </select>
          {phaseLocked && (
            <div style={{ ...body, fontSize: 11, color: LRH.mute, marginTop: 6, lineHeight: 1.4 }}>
              Championnat sans phase finale : tous les matchs sont en phase régulière. Pour des
              matchs à élimination, créez la compétition au format Coupe ou Championnat + phase finale.
            </div>
          )}
        </div>
        <div>
          <FieldLabel>Manche (aller-retour)</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.leg}
            onChange={(e) => setForm({ ...form, leg: e.target.value })}
          >
            <option value="">— Match simple —</option>
            <option value="1">Aller</option>
            <option value="2">Retour</option>
          </select>
        </div>
      </div>

      {/* Terrain */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel>
          Terrain {mode ? `(${mode === 'GAZON' ? 'gazon' : 'salle'})` : ''}
        </FieldLabel>
        {eligibleVenues.length === 0 ? (
          <div
            style={{
              padding: 12,
              background: 'rgba(243,188,28,0.08)',
              border: '1px dashed ' + LRH.gold,
              ...body,
              fontSize: 12.5,
              color: LRH.ink2,
            }}
          >
            {mode
              ? `Aucun terrain ${mode === 'GAZON' ? 'gazon' : 'salle'} dans le registre. Ajoutez-en un dans Administration ligue → Terrains.`
              : 'Sélectionnez d\'abord une compétition pour filtrer les terrains.'}
          </div>
        ) : (
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.venueId}
            onChange={(e) => setForm({ ...form, venueId: e.target.value })}
          >
            <option value="">— Aucun (à définir plus tard) —</option>
            {eligibleVenues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {v.city}
              </option>
            ))}
          </select>
        )}
        {suggestedVenueId && form.venueId !== suggestedVenueId && eligibleVenues.length > 0 && (
          <div
            style={{
              marginTop: 6,
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.08em',
            }}
          >
            Suggestion : terrain domicile du club {homeClub?.name} ·{' '}
            <button
              type="button"
              onClick={() => setForm({ ...form, venueId: suggestedVenueId })}
              style={{
                background: 'none',
                border: 'none',
                color: LRH.red,
                cursor: 'pointer',
                ...mono,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              Utiliser
            </button>
          </div>
        )}
      </div>

      {/* Équipe responsable logistique (admin) */}
      {isAdmin && (
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Équipe responsable logistique</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.organizerClubId}
            onChange={(e) => setForm({ ...form, organizerClubId: e.target.value })}
          >
            <option value="">— Aucune —</option>
            {(form.competitionId ? eligibleClubs : clubs).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.shortCode ? `(${c.shortCode})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Statut / scores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <FieldLabel>Statut *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as MatchStatus })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Score domicile</FieldLabel>
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={form.homeScore}
            onChange={(e) => setForm({ ...form, homeScore: e.target.value })}
            placeholder="—"
          />
        </div>
        <div>
          <FieldLabel>Score visiteur</FieldLabel>
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={form.awayScore}
            onChange={(e) => setForm({ ...form, awayScore: e.target.value })}
            placeholder="—"
          />
        </div>
      </div>

      {/* Arbitres (admin seulement) */}
      {isAdmin && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <FieldLabel>Arbitres</FieldLabel>
            <span
              style={{
                ...mono,
                fontSize: 9.5,
                color: LRH.mute,
                letterSpacing: '0.08em',
              }}
            >
              {principalsCount}/2 principaux · {deleguesCount}/1 délégué
            </span>
          </div>
          {referees.length === 0 ? (
            <div
              style={{
                padding: 12,
                background: 'rgba(243,188,28,0.08)',
                border: '1px dashed ' + LRH.gold,
                ...body,
                fontSize: 12.5,
                color: LRH.ink2,
              }}
            >
              Aucun arbitre dans le registre. Ajoutez-en dans Administration ligue → Arbitres.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.referees.length === 0 && (
                  <div
                    style={{
                      ...mono,
                      fontSize: 11,
                      color: LRH.mute,
                      letterSpacing: '0.08em',
                      padding: '10px 12px',
                      background: LRH.paperWarm,
                      border: '1px dashed ' + LRH.hairStrong,
                    }}
                  >
                    Aucun arbitre affecté.
                  </div>
                )}
                {form.referees.map((r, i) => {
                  const alreadyChosen = new Set(
                    form.referees
                      .map((x, j) => (j !== i ? x.refereeId : ''))
                      .filter(Boolean),
                  );
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...mono,
                          fontSize: 9.5,
                          fontWeight: 800,
                          padding: '4px 8px',
                          borderRadius: 2,
                          background: r.role === 'PRINCIPAL' ? LRH.navy : LRH.gold,
                          color: r.role === 'PRINCIPAL' ? '#fff' : LRH.navy,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          minWidth: 88,
                          textAlign: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {r.role === 'PRINCIPAL' ? 'Principal' : 'Délégué'}
                      </span>
                      <select
                        style={{ ...inputStyle, cursor: 'pointer', flex: 1 }}
                        value={r.refereeId}
                        onChange={(e) => updateRefereeAt(i, e.target.value)}
                      >
                        <option value="">— Choisir un arbitre —</option>
                        {referees.map((ref) => (
                          <option
                            key={ref.id}
                            value={ref.id}
                            disabled={alreadyChosen.has(ref.id) && ref.id !== r.refereeId}
                          >
                            {ref.fullName}
                            {ref.license ? ` (LIC ${ref.license})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeRefereeAt(i)}
                        style={{
                          ...body,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '6px 10px',
                          borderRadius: 4,
                          background: 'transparent',
                          color: LRH.red,
                          border: '1px solid ' + LRH.red,
                          cursor: 'pointer',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => addReferee('PRINCIPAL')}
                  disabled={principalsCount >= 2}
                  style={{
                    ...body,
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 4,
                    background: principalsCount >= 2 ? LRH.hairStrong : 'transparent',
                    color: principalsCount >= 2 ? LRH.mute : LRH.navy,
                    border: '1px solid ' + (principalsCount >= 2 ? LRH.hairStrong : LRH.navy),
                    cursor: principalsCount >= 2 ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  + Arbitre principal
                </button>
                <button
                  type="button"
                  onClick={() => addReferee('DELEGUE')}
                  disabled={deleguesCount >= 1}
                  style={{
                    ...body,
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: 4,
                    background: deleguesCount >= 1 ? LRH.hairStrong : 'transparent',
                    color: deleguesCount >= 1 ? LRH.mute : LRH.navy,
                    border: '1px solid ' + (deleguesCount >= 1 ? LRH.hairStrong : LRH.gold),
                    cursor: deleguesCount >= 1 ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  + Délégué
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginBottom: 12,
            padding: '8px 12px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

    </FormDialog>
  );
}

type MatchRowProps = {
  m: AdminMatchRow;
  isAdmin: boolean;
  clubId?: string;
  onEdit: () => void;
  onToggleNotes: () => void;
  notesOpen: boolean;
  onDelete: () => void;
};

/**
 * `MatchRowImpl` est mémoïsé en `MatchRow` (cf. plus bas).
 * Le comparator ignore les références de fonctions (qui changent à chaque
 * render du parent — `() => setEditing(...)` etc.) et compare uniquement
 * les props sémantiques. Les closures capturent `m` qui est identique tant
 * que la ligne n'a pas été éditée, donc pas de risque de stale callbacks.
 */
function MatchRowImpl({
  m,
  isAdmin,
  clubId,
  onEdit,
  onToggleNotes,
  notesOpen,
  onDelete,
}: MatchRowProps) {
  const isOwnClub = m.homeClubId === clubId || m.awayClubId === clubId;
  const canSeeNotes = isAdmin || isOwnClub;
  const canDelete = isAdmin;
  const pal = MODE_COLOR[m.competition.mode];
  const notesCount = m._count?.notes ?? 0;

  return (
    <div
      className="lrh-match-row"
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${pal.bg}`,
        padding: '14px 18px',
      }}
    >
      {/* Date column */}
      <div>
        <div
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.red,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {new Date(m.kickoffAt).toLocaleDateString('fr-FR', {
            timeZone: 'Indian/Reunion',
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          })}
        </div>
        <div
          style={{
            ...display,
            fontWeight: 700,
            fontSize: 18,
            color: LRH.navy,
            letterSpacing: '-0.02em',
            marginTop: 2,
          }}
        >
          {formatReunionTime(m.kickoffAt)}
        </div>
        {m.matchday != null && (
          <div
            style={{
              ...mono,
              fontSize: 9.5,
              color: LRH.mute,
              letterSpacing: '0.1em',
              marginTop: 4,
            }}
          >
            J{m.matchday.toString().padStart(2, '0')}
          </div>
        )}
      </div>

      {/* Teams + score column */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <ModeBadge mode={m.competition.mode} size="sm" />
          <CategoryBadge category={m.competition.category} size="sm" />
          <span
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.mute,
              letterSpacing: '0.06em',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
              minWidth: 0,
            }}
          >
            {m.competition.season} · {m.competition.name}
          </span>
          <StatusBadge status={m.status} />
        </div>
        <div className="lrh-match-teams">
          <ClubCrest id={m.homeClub?.shortCode ?? undefined} size={28} />
          <span
            className="lrh-match-team-name"
            style={{ ...display, fontSize: 14, color: LRH.navy }}
          >
            <span className="lrh-match-team-full">{sideName({ club: m.homeClub, label: m.homeLabel })}</span>
            <span className="lrh-match-team-short">{compactClubLabel(m.homeClub, m.homeLabel)}</span>
          </span>
          <span
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 20,
              color: LRH.navy,
              letterSpacing: '-0.03em',
              padding: '0 6px',
              flexShrink: 0,
            }}
          >
            {m.homeScore ?? '—'}
            <span style={{ color: LRH.mute, margin: '0 6px' }}>:</span>
            {m.awayScore ?? '—'}
          </span>
          <span
            className="lrh-match-team-name"
            style={{ ...display, fontSize: 14, color: LRH.navy }}
          >
            <span className="lrh-match-team-full">{sideName({ club: m.awayClub, label: m.awayLabel })}</span>
            <span className="lrh-match-team-short">{compactClubLabel(m.awayClub, m.awayLabel)}</span>
          </span>
          <ClubCrest id={m.awayClub?.shortCode ?? undefined} size={28} />
        </div>
        {(m.venueRef || m.venue) && (
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.06em',
              marginTop: 6,
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
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
              marginTop: 4,
            }}
          >
            ⚑ Organisé par {m.organizerClub.name}
          </div>
        )}
        {m.referees.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 6,
            }}
          >
            {m.referees.map((r) => (
              <span
                key={r.referee.id}
                style={{
                  ...mono,
                  fontSize: 9.5,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 2,
                  background: r.role === 'PRINCIPAL' ? LRH.navy : LRH.gold,
                  color: r.role === 'PRINCIPAL' ? '#fff' : LRH.navy,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: r.role === 'PRINCIPAL' ? '#fff' : LRH.navy,
                    opacity: 0.85,
                  }}
                />
                {r.role === 'PRINCIPAL' ? 'Arb' : 'Dél'} · {r.referee.fullName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="lrh-match-actions">
        <Link
          href={`/dashboard/matches/${m.id}`}
          style={{
            ...body,
            fontSize: 11.5,
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: 4,
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
            onClick={onEdit}
            style={{
              ...body,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 4,
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
        {canSeeNotes && (
          <button
            onClick={onToggleNotes}
            style={{
              ...body,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 4,
              background: notesOpen ? LRH.navy : 'transparent',
              color: notesOpen ? '#fff' : LRH.navy,
              border: '1px solid ' + LRH.navy,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Notes
            {notesCount > 0 && (
              <span
                style={{
                  ...mono,
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: notesOpen ? LRH.gold : LRH.navy,
                  color: notesOpen ? LRH.navy : '#fff',
                  letterSpacing: '0.04em',
                }}
              >
                {notesCount}
              </span>
            )}
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            style={{
              ...body,
              fontSize: 11.5,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 4,
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

// Mémoïsation : sans ça, un toggle Notes ou un changement d'edit form
// re-rend les 20 rows alors qu'aucun match n'a changé. Comparator custom
// qui ignore les refs de fonctions (re-créées à chaque render parent).
const MatchRow = React.memo(MatchRowImpl, (prev, next) =>
  prev.m === next.m &&
  prev.isAdmin === next.isAdmin &&
  prev.clubId === next.clubId &&
  prev.notesOpen === next.notesOpen,
);

export function NotesPanel({
  matchId,
  currentUserId,
  isAdmin,
}: {
  matchId: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<MatchNoteRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await listMatchNotes(matchId);
      setNotes(rows);
    } catch (e: any) {
      setLoadError(e?.message || 'Impossible de charger les notes');
    }
  }, [matchId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const submit = async () => {
    if (draft.trim().length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await createMatchNote(matchId, { body: draft.trim() });
      setDraft('');
      await reload();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer cette note ?')) return;
    try {
      await deleteMatchNote(id);
      await reload();
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur');
    }
  };

  return (
    <div
      style={{
        background: LRH.paperWarm,
        borderTop: '1px dashed ' + LRH.hairStrong,
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          color: LRH.red,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        ▸ Notes & remarques
      </div>

      {loadError ? (
        <div style={{ ...mono, fontSize: 11, color: LRH.red }}>⚠ {loadError}</div>
      ) : notes == null ? (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.mute,
            letterSpacing: '0.08em',
          }}
        >
          Chargement…
        </div>
      ) : notes.length === 0 ? (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.mute,
            letterSpacing: '0.08em',
            padding: '10px 12px',
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
            marginBottom: 12,
          }}
        >
          Aucune note pour ce match. Ajoutez une remarque, un désaccord sur le score ou toute information utile à la ligue.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {notes.map((n) => {
            const author = n.author;
            const isAuthorAdmin = author.role === 'ADMIN';
            const canDelete = isAdmin || author.id === currentUserId;
            return (
              <div
                key={n.id}
                style={{
                  background: '#fff',
                  border: '1px solid ' + LRH.hair,
                  borderLeft: `3px solid ${isAuthorAdmin ? LRH.gold : LRH.navy}`,
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      ...mono,
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 2,
                      background: isAuthorAdmin ? LRH.gold : LRH.navy,
                      color: isAuthorAdmin ? LRH.navy : '#fff',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isAuthorAdmin ? 'Ligue' : author.club?.shortCode ?? author.club?.name ?? 'Club'}
                  </span>
                  <span
                    style={{
                      ...body,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: LRH.navy,
                    }}
                  >
                    {author.name || author.email || 'Anonyme'}
                  </span>
                  <span
                    style={{
                      ...mono,
                      fontSize: 9.5,
                      color: LRH.mute,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {new Date(n.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div style={{ flex: 1 }} />
                  {canDelete && (
                    <button
                      onClick={() => onDelete(n.id)}
                      style={{
                        ...mono,
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: LRH.red,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        padding: 0,
                      }}
                    >
                      Suppr.
                    </button>
                  )}
                </div>
                <div
                  style={{
                    ...body,
                    fontSize: 13,
                    color: LRH.ink,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  {n.body}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <textarea
          rows={2}
          maxLength={2000}
          placeholder="Ajouter une note (max 2000 caractères) — désaccord sur le score, contexte du match, blessure signalée, etc."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{
            ...inputStyle,
            flex: 1,
            minHeight: 56,
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: 1.55,
          }}
        />
        <button
          onClick={submit}
          disabled={saving || draft.trim().length === 0}
          style={{
            ...inputStyle,
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            background: draft.trim().length === 0 ? LRH.hairStrong : LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: saving || draft.trim().length === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '12px 16px',
            width: 'auto',
            whiteSpace: 'nowrap',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '…' : 'Publier'}
        </button>
      </div>
      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginTop: 8,
          }}
        >
          ⚠ {error}
        </div>
      )}
    </div>
  );
}

export function MatchesAdmin({
  matches,
  competitions,
  clubs,
  venues,
  referees,
  entriesByCompetition,
  clubId,
  isAdmin,
  currentUserId,
  activeSeason,
}: {
  matches: AdminMatchRow[];
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
  venues: VenueAdminRow[];
  referees: RefereeAdminRow[];
  entriesByCompetition: Record<string, string[]>;
  clubId?: string;
  isAdmin: boolean;
  currentUserId: string;
  /** Saison `EN_COURS` — selection initiale du filtre. */
  activeSeason: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [notesMatchId, setNotesMatchId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('recent-first');
  const [season, setSeason] = useState<string>(activeSeason ?? ALL_SEASONS);
  const [isPending, startTransition] = useTransition();
  // Optimistic delete : la ligne disparaît immédiatement après confirmation.
  // Si le server action échoue, router.refresh() restaure la liste vraie.
  const [optimisticMatches, removeOptimistic] = useOptimistic(
    matches,
    (state: AdminMatchRow[], removeId: string) => state.filter((m) => m.id !== removeId),
  );
  const PAGE_SIZE = 20;

  const refresh = () => {
    setEditing(null);
    router.refresh();
  };

  const onDelete = (m: AdminMatchRow) => {
    if (!confirm(`Supprimer le match ${sideName({ club: m.homeClub, label: m.homeLabel })} vs ${sideName({ club: m.awayClub, label: m.awayLabel })} du ${formatReunionDate(m.kickoffAt)} ?`)) {
      return;
    }
    startTransition(async () => {
      removeOptimistic(m.id);
      try {
        await deleteMatch(m.id);
        router.refresh();
      } catch (e: any) {
        alert(e?.message || 'Erreur de suppression');
        router.refresh();
      }
    });
  };

  // Tri global appliqué AVANT la pagination, pour que le tri "anciens d'abord"
  // ne montre pas la page courante de la sort par défaut.
  // Source = optimisticMatches : un delete fait disparaître la ligne sans
  // attendre le round-trip serveur.
  const seasons = seasonsOf(matches, (m) => m.competition.season);
  const seasonMatches = useMemo(
    () => (season === ALL_SEASONS ? optimisticMatches : optimisticMatches.filter((m) => m.competition.season === season)),
    [optimisticMatches, season],
  );

  const sortedMatches = useMemo(() => {
    const list = [...seasonMatches];
    if (sortMode === 'oldest-first') {
      list.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    } else {
      // recent-first par défaut (mode 'recent-first', 'by-competition', 'by-month')
      list.sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());
    }
    return list;
  }, [seasonMatches, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sortedMatches.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMatches = useMemo(
    () => sortedMatches.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedMatches, currentPage],
  );

  // Reset page quand on change de tri (sinon on peut se retrouver hors plage)
  React.useEffect(() => {
    setPage(1);
  }, [sortMode]);

  // Groupage selon le mode de tri : par compétition, par mois, ou "flat" (1 seul groupe).
  type Group = { label: string; meta?: AdminMatchRow['competition']; rows: AdminMatchRow[] };
  const groups = useMemo<Group[]>(() => {
    if (sortMode === 'by-competition') {
      const map = new Map<string, Group & { meta: AdminMatchRow['competition'] }>();
      for (const m of paginatedMatches) {
        const k = m.competition.id;
        if (!map.has(k)) map.set(k, { label: '', meta: m.competition, rows: [] });
        map.get(k)!.rows.push(m);
      }
      return Array.from(map.values()).sort((a, b) => {
        return b.meta.season.localeCompare(a.meta.season) || a.meta.name.localeCompare(b.meta.name);
      });
    }
    if (sortMode === 'by-month') {
      const map = new Map<string, Group>();
      for (const m of paginatedMatches) {
        const d = new Date(m.kickoffAt);
        const reunion = toReunionDatetimeLocal(d);
        const key = reunion.slice(0, 7);
        const label = d.toLocaleDateString('fr-FR', { timeZone: 'Indian/Reunion', month: 'long', year: 'numeric' });
        if (!map.has(key)) map.set(key, { label, rows: [] });
        map.get(key)!.rows.push(m);
      }
      // Conserve l'ordre par date (récent → ancien par défaut)
      return Array.from(map.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([, v]) => v);
    }
    // recent-first / oldest-first : un seul groupe plat
    return [{ label: '', rows: paginatedMatches }];
  }, [paginatedMatches, sortMode]);

  // Création de match : ADMIN uniquement. Les managers de club ont un rôle
  // de consultation et de saisie de score post-match (cf. décision Phase D).
  const canCreate = isAdmin;

  return (
    <div>
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

      {canCreate && competitions.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(243,188,28,0.08)',
            border: '1px dashed ' + LRH.gold,
            borderRadius: 4,
          }}
        >
          <span style={{ ...body, fontSize: 12.5, color: LRH.mute }}>
            Les actions de création (nouveau match, journée, tirage) sont dans le calendrier.
          </span>
          <Link
            href="/dashboard/matches/calendar"
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              padding: '8px 14px',
              background: LRH.navy,
              color: '#fff',
              border: 'none',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ▦ Aller au calendrier
          </Link>
        </div>
      )}

      {competitions.length === 0 && (
        <div
          style={{
            padding: 24,
            background: 'rgba(243,188,28,0.08)',
            border: '1px dashed ' + LRH.gold,
            marginBottom: 20,
            ...body,
            fontSize: 13,
            color: LRH.ink2,
          }}
        >
          Aucune compétition n'a encore été créée. Rendez-vous dans
          <strong style={{ color: LRH.navy }}> Administration ligue → Compétitions </strong>
          pour en ajouter une avant de créer des matchs.
        </div>
      )}

      {seasons.length > 1 && (
        <div style={{
          marginBottom: 20, paddingBottom: 16,
          borderBottom: '1px dashed ' + LRH.hairStrong,
        }}>
          <SeasonFilter seasons={seasons} value={season} onChange={setSeason} />
        </div>
      )}

      {seasonMatches.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#fff',
            border: '1px dashed ' + LRH.hairStrong,
          }}
        >
          <div
            style={{
              ...mono,
              fontSize: 11,
              color: LRH.mute,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            [ vide ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucun match enregistré pour l'instant.
          </div>
        </div>
      ) : (
        <>
          {/* Sélecteur de tri — chips sticky en haut de la liste */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 18,
              padding: '10px 0',
              borderTop: '1px dashed ' + LRH.hairStrong,
              borderBottom: '1px dashed ' + LRH.hairStrong,
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 10,
                color: LRH.mute,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginRight: 4,
              }}
            >
              Trier :
            </span>
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSortMode(opt.value)}
                  style={{
                    ...mono,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: '6px 12px',
                    background: isActive ? LRH.navy : '#fff',
                    color: isActive ? '#fff' : LRH.ink2,
                    border: `1px solid ${isActive ? LRH.navy : LRH.hairStrong}`,
                    cursor: 'pointer',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
              opacity: isPending ? 0.85 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {groups.map((group, gi) => {
              const comp = group.meta;
              const headerless = !comp && !group.label;
              return (
                <div key={comp ? comp.id : `${group.label}-${gi}`}>
                  {!headerless && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ width: 14, height: 2, background: LRH.gold }} />
                      {comp ? (
                        <>
                          <ModeBadge mode={comp.mode} size="sm" />
                          <CategoryBadge category={comp.category} size="sm" />
                          <div
                            style={{
                              ...display,
                              fontWeight: 700,
                              fontSize: 16,
                              color: LRH.navy,
                              letterSpacing: '-0.01em',
                            }}
                          >
                            {comp.name}
                          </div>
                          <div
                            style={{
                              ...mono,
                              fontSize: 10,
                              color: LRH.mute,
                              letterSpacing: '0.1em',
                            }}
                          >
                            {comp.season}
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            ...display,
                            fontWeight: 700,
                            fontSize: 16,
                            color: LRH.navy,
                            letterSpacing: '-0.01em',
                            textTransform: 'capitalize',
                          }}
                        >
                          {group.label}
                        </div>
                      )}
                      <div style={{ flex: 1, height: 1, background: LRH.hair }} />
                      <div
                        style={{
                          ...mono,
                          fontSize: 10,
                          color: LRH.mute,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {group.rows.length.toString().padStart(2, '0')} match{group.rows.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.rows.map((m) => (
                      <div key={m.id}>
                        <MatchRow
                          m={m}
                          isAdmin={isAdmin}
                          clubId={clubId}
                          onEdit={() => setEditing(rowToForm(m))}
                          onToggleNotes={() =>
                            setNotesMatchId((cur) => (cur === m.id ? null : m.id))
                          }
                          notesOpen={notesMatchId === m.id}
                          onDelete={() => onDelete(m)}
                        />
                        {notesMatchId === m.id && (
                          <NotesPanel
                            matchId={m.id}
                            currentUserId={currentUserId}
                            isAdmin={isAdmin}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Paginator
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={seasonMatches.length}
        onPageChange={(p) => {
          setPage(p);
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        itemLabel="match"
      />
    </div>
  );
}
