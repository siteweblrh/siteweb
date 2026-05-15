'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, ClubCrest, MODE_COLOR } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge, StatusBadge } from '@/components/lrh/Badge';
import {
  createMatch,
  updateMatch,
  deleteMatch,
  type AdminMatchRow,
  type ClubForAdmin,
  type CompetitionAdminRow,
} from '@/lib/actions/competition';

type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HALFTIME'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED';

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Programmé' },
  { value: 'LIVE', label: 'En cours' },
  { value: 'HALFTIME', label: 'Mi-temps' },
  { value: 'FINISHED', label: 'Terminé' },
  { value: 'POSTPONED', label: 'Reporté' },
  { value: 'CANCELLED', label: 'Annulé' },
];

type FormState = {
  id?: string;
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  kickoffAt: string; // datetime-local string
  venue: string;
  matchday: string;
  status: MatchStatus;
  homeScore: string;
  awayScore: string;
};

const EMPTY_FORM = (defaults?: Partial<FormState>): FormState => ({
  competitionId: defaults?.competitionId ?? '',
  homeClubId: defaults?.homeClubId ?? '',
  awayClubId: defaults?.awayClubId ?? '',
  kickoffAt: defaults?.kickoffAt ?? '',
  venue: defaults?.venue ?? '',
  matchday: defaults?.matchday ?? '',
  status: defaults?.status ?? 'SCHEDULED',
  homeScore: defaults?.homeScore ?? '',
  awayScore: defaults?.awayScore ?? '',
});

function toDatetimeLocal(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function rowToForm(m: AdminMatchRow): FormState {
  return {
    id: m.id,
    competitionId: m.competition.id,
    homeClubId: m.homeClubId,
    awayClubId: m.awayClubId,
    kickoffAt: toDatetimeLocal(m.kickoffAt),
    venue: m.venue ?? '',
    matchday: m.matchday != null ? String(m.matchday) : '',
    status: m.status as MatchStatus,
    homeScore: m.homeScore != null ? String(m.homeScore) : '',
    awayScore: m.awayScore != null ? String(m.awayScore) : '',
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

function MatchForm({
  initial,
  competitions,
  clubs,
  isAdmin,
  onCancel,
  onDone,
}: {
  initial: FormState;
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
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

    setSaving(true);
    setError(null);
    try {
      const matchday = form.matchday.trim() === '' ? null : Number(form.matchday);
      const homeScore = form.homeScore.trim() === '' ? null : Number(form.homeScore);
      const awayScore = form.awayScore.trim() === '' ? null : Number(form.awayScore);

      if (isEdit && initial.id) {
        await updateMatch(initial.id, {
          ...(isAdmin ? { homeClubId: form.homeClubId, awayClubId: form.awayClubId } : {}),
          kickoffAt: new Date(form.kickoffAt),
          venue: form.venue.trim() || null,
          matchday,
          status: form.status,
          homeScore,
          awayScore,
        });
      } else {
        await createMatch({
          competitionId: form.competitionId,
          homeClubId: form.homeClubId,
          awayClubId: form.awayClubId,
          kickoffAt: new Date(form.kickoffAt),
          venue: form.venue.trim() || null,
          matchday: matchday ?? null,
          status: form.status,
          homeScore: homeScore ?? null,
          awayScore: awayScore ?? null,
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
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${LRH.red}`,
        padding: 24,
        marginBottom: 16,
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
        {isEdit ? '▸ Modifier le match' : '▸ Nouveau match'}
      </div>

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
      </div>

      {/* Équipes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <FieldLabel>Club domicile *</FieldLabel>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={form.homeClubId}
            disabled={isEdit && !isAdmin}
            onChange={(e) => setForm({ ...form, homeClubId: e.target.value })}
          >
            <option value="">— Choisir —</option>
            {clubs.map((c) => (
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
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.shortCode ? `(${c.shortCode})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date / lieu / journée */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 0.6fr',
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
          <FieldLabel>Lieu</FieldLabel>
          <input
            style={inputStyle}
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            placeholder="Saint-Denis — Plateau Sportif"
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
      </div>

      {/* Statut / scores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 0.6fr 0.6fr',
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

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={submit} disabled={saving} style={btnPrimary}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={onCancel} disabled={saving} style={btnGhost}>
          Annuler
        </button>
      </div>
    </div>
  );
}

function MatchRow({
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
  const canEdit = isAdmin || m.homeClubId === clubId || m.awayClubId === clubId;
  const canDelete = isAdmin;
  const pal = MODE_COLOR[m.competition.mode];

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${pal.bg}`,
        padding: '14px 18px',
        display: 'grid',
        gridTemplateColumns: '110px 1fr auto',
        alignItems: 'center',
        gap: 16,
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
          {new Date(m.kickoffAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
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
      <div>
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
          <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.06em' }}>
            {m.competition.season} · {m.competition.name}
          </span>
          <StatusBadge status={m.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClubCrest id={m.homeClub.shortCode ?? undefined} size={28} />
          <span
            style={{
              ...display,
              fontWeight: 700,
              fontSize: 14,
              color: LRH.navy,
              letterSpacing: '-0.01em',
            }}
          >
            {m.homeClub.name}
          </span>
          <span
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 20,
              color: LRH.navy,
              letterSpacing: '-0.03em',
              padding: '0 6px',
            }}
          >
            {m.homeScore ?? '—'}
            <span style={{ color: LRH.mute, margin: '0 6px' }}>:</span>
            {m.awayScore ?? '—'}
          </span>
          <span
            style={{
              ...display,
              fontWeight: 700,
              fontSize: 14,
              color: LRH.navy,
              letterSpacing: '-0.01em',
            }}
          >
            {m.awayClub.name}
          </span>
          <ClubCrest id={m.awayClub.shortCode ?? undefined} size={28} />
        </div>
        {m.venue && (
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.06em',
              marginTop: 6,
            }}
          >
            ◉ {m.venue}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {canEdit && (
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

export function MatchesAdmin({
  matches,
  competitions,
  clubs,
  clubId,
  isAdmin,
}: {
  matches: AdminMatchRow[];
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
  clubId?: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);

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

  // Group by competition for readability
  const byCompetition = useMemo(() => {
    const map = new Map<string, { comp: AdminMatchRow['competition']; rows: AdminMatchRow[] }>();
    for (const m of matches) {
      const k = m.competition.id;
      if (!map.has(k)) map.set(k, { comp: m.competition, rows: [] });
      map.get(k)!.rows.push(m);
    }
    return Array.from(map.values()).sort((a, b) => {
      const sa = a.comp.season;
      const sb = b.comp.season;
      return sb.localeCompare(sa) || a.comp.name.localeCompare(b.comp.name);
    });
  }, [matches]);

  const canCreate = isAdmin || Boolean(clubId);

  return (
    <div>
      {editing && (
        <MatchForm
          initial={editing}
          competitions={competitions}
          clubs={clubs}
          isAdmin={isAdmin}
          onCancel={() => setEditing(null)}
          onDone={refresh}
        />
      )}

      {!editing && canCreate && competitions.length > 0 && (
        <button
          onClick={() => setEditing(EMPTY_FORM())}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '12px 20px',
            borderRadius: 4,
            background: LRH.red,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          + Nouveau match
        </button>
      )}

      {!editing && competitions.length === 0 && (
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

      {matches.length === 0 && !editing ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {byCompetition.map(({ comp, rows }) => (
            <div key={comp.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ width: 14, height: 2, background: LRH.gold }} />
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
                  {rows.length.toString().padStart(2, '0')} match{rows.length > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rows.map((m) => (
                  <MatchRow
                    key={m.id}
                    m={m}
                    isAdmin={isAdmin}
                    clubId={clubId}
                    onEdit={() => setEditing(rowToForm(m))}
                    onDelete={() => onDelete(m)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
