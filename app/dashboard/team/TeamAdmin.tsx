'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { ImageUploader } from '@/components/lrh/upload/ImageUploader';
import {
  createMember,
  updateMember,
  deleteMember,
  setMemberCompetitionStats,
  type MemberInput,
  type MemberRow,
  type MemberStatsRow,
} from '@/lib/actions/member';

type EligibleCompetition = {
  id: string;
  name: string;
  mode: 'GAZON' | 'SALLE';
  season: string;
  category: string;
};

const KIND_LABEL: Record<MemberRow['kind'], string> = {
  PLAYER: 'Joueurs',
  COACH: 'Encadrement',
  STAFF: 'Staff',
};
const KIND_ACCENT: Record<MemberRow['kind'], string> = {
  PLAYER: LRH.navy,
  COACH: LRH.red,
  STAFF: '#2c7a3f',
};
const KIND_KICKER: Record<MemberRow['kind'], string> = {
  PLAYER: '01 · Joueurs licenciés',
  COACH: '02 · Encadrement sportif',
  STAFF: '03 · Staff & dirigeants',
};

const CATEGORY_LABEL: Record<MemberRow['category'], string> = {
  U11: 'U11',
  U14: 'U14',
  U17: 'U17',
  U19: 'U19',
  SENIOR: 'Sénior',
  VETERAN: 'Vétéran',
};

const CATEGORY_ORDER: MemberRow['category'][] = [
  'U11',
  'U14',
  'U17',
  'U19',
  'SENIOR',
  'VETERAN',
];

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

const emptyForm: MemberInput = {
  firstName: '',
  lastName: '',
  license: '',
  kind: 'PLAYER',
  category: 'SENIOR',
  position: '',
  jerseyNumber: null,
  photo: '',
  birthdate: '',
  isFeatured: false,
  featuredHeadline: '',
};

function memberToInput(m: MemberRow): MemberInput {
  return {
    firstName: m.firstName,
    lastName: m.lastName,
    license: m.license,
    kind: m.kind,
    category: m.category,
    position: m.position ?? '',
    jerseyNumber: m.jerseyNumber ?? null,
    photo: m.photo ?? '',
    birthdate: m.birthdate ? m.birthdate.toString().substring(0, 10) : '',
    isFeatured: m.isFeatured,
    featuredHeadline: m.featuredHeadline ?? '',
  };
}

function memberTotals(m: MemberRow) {
  return m.competitionStats.reduce(
    (acc, s) => ({
      matchesPlayed: acc.matchesPlayed + s.matchesPlayed,
      goalsScored: acc.goalsScored + s.goalsScored,
    }),
    { matchesPlayed: 0, goalsScored: 0 },
  );
}

export function TeamAdmin({
  clubId,
  members,
  eligibleCompetitions,
}: {
  clubId: string;
  members: MemberRow[];
  eligibleCompetitions: EligibleCompetition[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<MemberInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<MemberRow['kind'], MemberRow[]> = {
      PLAYER: [],
      COACH: [],
      STAFF: [],
    };
    for (const m of members) g[m.kind].push(m);
    return g;
  }, [members]);

  const playersByCategory = useMemo(() => {
    const map = new Map<MemberRow['category'], MemberRow[]>();
    for (const c of CATEGORY_ORDER) map.set(c, []);
    for (const m of grouped.PLAYER) {
      map.get(m.category)!.push(m);
    }
    return map;
  }, [grouped.PLAYER]);

  const editingMember = useMemo(
    () => members.find((m) => m.id === editingId) ?? null,
    [members, editingId],
  );

  const set = <K extends keyof MemberInput>(k: K, v: MemberInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const startCreate = () => {
    setEditingId(null);
    setCreating(true);
    setForm(emptyForm);
    setError(null);
  };

  const startEdit = (m: MemberRow) => {
    setCreating(false);
    setEditingId(m.id);
    setForm(memberToInput(m));
    setError(null);
  };

  const cancel = () => {
    setCreating(false);
    setEditingId(null);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        await updateMember(editingId, form);
      } else {
        await createMember(clubId, form);
      }
      cancel();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer ${name} de l'effectif ?`)) return;
    setError(null);
    try {
      await deleteMember(id);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la suppression');
    }
  };

  const isPlayerForm = form.kind === 'PLAYER';

  return (
    <div>
      {/* Add button (collapsed) */}
      {!creating && !editingId && (
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={startCreate}
            style={{
              ...body,
              fontSize: 12.5,
              fontWeight: 700,
              padding: '12px 22px',
              background: LRH.navy,
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            + Ajouter un membre
          </button>
          <span
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.12em',
              marginLeft: 14,
            }}
          >
            {members.length} licencié{members.length > 1 ? 's' : ''} au total
          </span>
        </div>
      )}

      {/* Form */}
      {(creating || editingId) && (
        <form
          onSubmit={onSubmit}
          style={{
            background: '#fff',
            border: '1px solid ' + LRH.hair,
            borderLeft: '3px solid ' + LRH.gold,
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
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            {editingId ? 'Modifier le licencié' : 'Nouveau licencié'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <FieldLabel>Type</FieldLabel>
              <select
                value={form.kind}
                onChange={(e) => set('kind', e.target.value as MemberRow['kind'])}
                style={inputStyle}
              >
                <option value="PLAYER">Joueur / Joueuse</option>
                <option value="COACH">Encadrement (coach)</option>
                <option value="STAFF">Staff / Dirigeant</option>
              </select>
            </div>
            <div>
              <FieldLabel>Prénom *</FieldLabel>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Nom *</FieldLabel>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16, marginBottom: 16 }}>
            <div>
              <FieldLabel>N° de licence *</FieldLabel>
              <input
                value={form.license}
                onChange={(e) => set('license', e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Date de naissance</FieldLabel>
              <input
                type="date"
                value={form.birthdate}
                onChange={(e) => set('birthdate', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>Poste / Rôle</FieldLabel>
              <input
                placeholder={isPlayerForm ? 'Attaquant, Gardien, ...' : 'Coach principal, Trésorier, ...'}
                value={form.position ?? ''}
                onChange={(e) => set('position', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {isPlayerForm && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <FieldLabel>Catégorie</FieldLabel>
                  <select
                    value={form.category}
                    onChange={(e) => set('category', e.target.value as MemberRow['category'])}
                    style={inputStyle}
                  >
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Numéro de maillot</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={form.jerseyNumber ?? ''}
                    onChange={(e) =>
                      set('jerseyNumber', e.target.value === '' ? null : Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </div>
              </div>
              <div
                style={{
                  background: form.isFeatured ? 'rgba(243,188,28,0.08)' : LRH.paperWarm,
                  border: '1px solid ' + (form.isFeatured ? LRH.gold : LRH.hair),
                  borderLeft: `3px solid ${form.isFeatured ? LRH.gold : LRH.hairStrong}`,
                  padding: '12px 14px',
                  marginBottom: 16,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form.isFeatured)}
                    onChange={(e) => set('isFeatured', e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <span
                    style={{
                      ...mono,
                      fontSize: 11,
                      fontWeight: 700,
                      color: form.isFeatured ? LRH.navy : LRH.mute,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ● À la une — carte large sur la fiche publique
                  </span>
                </label>
                {form.isFeatured && (
                  <div style={{ marginTop: 12 }}>
                    <FieldLabel>Mention (capitaine, citation, exploit récent…)</FieldLabel>
                    <input
                      type="text"
                      maxLength={200}
                      placeholder="Capitaine · Meilleur(e) buteur(se) 2024…"
                      value={form.featuredHeadline ?? ''}
                      onChange={(e) => set('featuredHeadline', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ marginBottom: 16, maxWidth: 360 }}>
            <ImageUploader
              label="Photo du membre"
              value={form.photo}
              onChange={(url) => set('photo', url ?? '')}
              hint="Photo carrée ou portrait recommandée."
              height={140}
            />
          </div>

          {error && (
            <div
              style={{
                ...mono,
                fontSize: 11,
                color: LRH.red,
                marginBottom: 16,
                padding: '10px 14px',
                background: 'rgba(168,32,47,0.08)',
                border: '1px solid rgba(168,32,47,0.2)',
              }}
            >
              ⚠ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...body,
                fontSize: 12.5,
                fontWeight: 700,
                padding: '11px 22px',
                background: LRH.navy,
                color: '#fff',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Ajouter au club'}
            </button>
            <button
              type="button"
              onClick={cancel}
              style={{
                ...mono,
                fontSize: 10.5,
                fontWeight: 700,
                padding: '11px 18px',
                background: '#fff',
                color: LRH.navy,
                border: '1px solid ' + LRH.hairStrong,
                cursor: 'pointer',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Stats panel (only visible when editing a PLAYER) */}
      {editingMember && editingMember.kind === 'PLAYER' && (
        <StatsPanel
          key={editingMember.id}
          member={editingMember}
          eligibleCompetitions={eligibleCompetitions}
          onSaved={() => router.refresh()}
        />
      )}

      <div style={{ height: 12 }} />

      {/* Sections by kind */}
      <KindSection
        kind="PLAYER"
        kicker={KIND_KICKER.PLAYER}
        accent={KIND_ACCENT.PLAYER}
        members={grouped.PLAYER}
        playersByCategory={playersByCategory}
        onEdit={startEdit}
        onDelete={onDelete}
      />
      <KindSection
        kind="COACH"
        kicker={KIND_KICKER.COACH}
        accent={KIND_ACCENT.COACH}
        members={grouped.COACH}
        onEdit={startEdit}
        onDelete={onDelete}
      />
      <KindSection
        kind="STAFF"
        kicker={KIND_KICKER.STAFF}
        accent={KIND_ACCENT.STAFF}
        members={grouped.STAFF}
        onEdit={startEdit}
        onDelete={onDelete}
      />

      {members.length === 0 && (
        <div
          style={{
            padding: 40,
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
            [ effectif vide ]
          </div>
          <div style={{ ...body, fontSize: 14, color: LRH.ink2, marginTop: 10 }}>
            Aucun licencié enregistré pour ce club. Cliquez sur « + Ajouter un membre » pour commencer.
          </div>
        </div>
      )}
    </div>
  );
}

function StatsPanel({
  member,
  eligibleCompetitions,
  onSaved,
}: {
  member: MemberRow;
  eligibleCompetitions: EligibleCompetition[];
  onSaved: () => void;
}) {
  // Une rangée par compétition éligible. Les valeurs initiales viennent des
  // competitionStats existantes ; les compétitions sans stats commencent à 0.
  const initialRows = useMemo(() => {
    const existing = new Map(
      member.competitionStats.map((s) => [s.competitionId, s]),
    );
    return eligibleCompetitions.map((c) => {
      const e = existing.get(c.id);
      return {
        competitionId: c.id,
        name: c.name,
        mode: c.mode,
        season: c.season,
        category: c.category,
        matchesPlayed: e?.matchesPlayed ?? 0,
        goalsScored: e?.goalsScored ?? 0,
      };
    });
  }, [member.competitionStats, eligibleCompetitions]);

  const [rows, setRows] = useState(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const updateRow = (
    competitionId: string,
    patch: { matchesPlayed?: number; goalsScored?: number },
  ) => {
    setRows((rs) =>
      rs.map((r) =>
        r.competitionId === competitionId ? { ...r, ...patch } : r,
      ),
    );
  };

  const onSave = async () => {
    setError(null);
    setSaving(true);
    try {
      // On envoie uniquement les rangées avec au moins une valeur non nulle ;
      // celles à 0/0 sont implicites et n'ont pas besoin d'exister en DB.
      const list: MemberStatsRow[] = rows
        .filter((r) => r.matchesPlayed > 0 || r.goalsScored > 0)
        .map((r) => ({
          competitionId: r.competitionId,
          matchesPlayed: r.matchesPlayed,
          goalsScored: r.goalsScored,
        }));
      await setMemberCompetitionStats(member.id, list);
      setSavedAt(Date.now());
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la sauvegarde des stats');
    } finally {
      setSaving(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({
      matchesPlayed: acc.matchesPlayed + r.matchesPlayed,
      goalsScored: acc.goalsScored + r.goalsScored,
    }),
    { matchesPlayed: 0, goalsScored: 0 },
  );

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: '3px solid ' + LRH.red,
        padding: 24,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              ...mono,
              fontSize: 11,
              fontWeight: 700,
              color: LRH.red,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Stats par compétition
          </div>
          <div
            style={{
              ...body,
              fontSize: 13,
              color: LRH.ink2,
              marginTop: 4,
            }}
          >
            Matchs joués et buts marqués de{' '}
            <strong>
              {member.firstName} {member.lastName}
            </strong>{' '}
            pour chaque compétition où votre club est engagé.
          </div>
        </div>
        <div
          style={{
            background: LRH.paperWarm,
            padding: '8px 14px',
            border: '1px solid ' + LRH.hair,
            display: 'flex',
            gap: 18,
            alignItems: 'baseline',
          }}
        >
          <div>
            <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
              Total MJ
            </div>
            <div style={{ ...display, fontSize: 22, fontWeight: 800, color: LRH.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {totals.matchesPlayed}
            </div>
          </div>
          <div>
            <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Buts
            </div>
            <div style={{ ...display, fontSize: 22, fontWeight: 800, color: LRH.red, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {totals.goalsScored}
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: 'center',
            background: LRH.paperWarm,
            border: '1px dashed ' + LRH.hairStrong,
          }}
        >
          <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            [ aucune compétition éligible ]
          </div>
          <div style={{ ...body, fontSize: 13, color: LRH.ink2, marginTop: 8 }}>
            Inscrivez d&apos;abord votre club dans une compétition côté ligue
            pour pouvoir saisir des statistiques par tournoi.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <div
              key={r.competitionId}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))',
                gap: 14,
                alignItems: 'center',
                padding: '10px 14px',
                background: LRH.paperWarm,
                border: '1px solid ' + LRH.hair,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ ...display, fontWeight: 700, fontSize: 14, color: LRH.navy, letterSpacing: '-0.01em' }}>
                  {r.name}
                </div>
                <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.12em', marginTop: 2 }}>
                  {r.mode} · {r.season} · {r.category}
                </div>
              </div>
              <div>
                <FieldLabel>MJ</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={r.matchesPlayed}
                  onChange={(e) =>
                    updateRow(r.competitionId, {
                      matchesPlayed: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Buts</FieldLabel>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={r.goalsScored}
                  onChange={(e) =>
                    updateRow(r.competitionId, {
                      goalsScored: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            color: LRH.red,
            marginTop: 14,
            padding: '10px 14px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || rows.length === 0}
          style={{
            ...body,
            fontSize: 12.5,
            fontWeight: 700,
            padding: '11px 22px',
            background: LRH.red,
            color: '#fff',
            border: 'none',
            cursor: saving || rows.length === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: saving || rows.length === 0 ? 0.6 : 1,
          }}
        >
          {saving ? 'Enregistrement…' : 'Sauvegarder les stats'}
        </button>
        {savedAt && (
          <span style={{ ...mono, fontSize: 10.5, color: '#1d6b3f', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }}>
            ✓ Sauvegardé
          </span>
        )}
      </div>
    </div>
  );
}

function KindSection({
  kind,
  kicker,
  accent,
  members,
  playersByCategory,
  onEdit,
  onDelete,
}: {
  kind: MemberRow['kind'];
  kicker: string;
  accent: string;
  members: MemberRow[];
  playersByCategory?: Map<MemberRow['category'], MemberRow[]>;
  onEdit: (m: MemberRow) => void;
  onDelete: (id: string, name: string) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ width: 28, height: 2, background: accent }} />
        <span
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            color: accent,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {kicker}
        </span>
        <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>
          · {members.length}
        </span>
      </div>

      {kind === 'PLAYER' && playersByCategory ? (
        <>
          {Array.from(playersByCategory.entries())
            .filter(([, list]) => list.length > 0)
            .map(([cat, list]) => (
              <div key={cat} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    fontWeight: 700,
                    color: LRH.mute,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  ▸ {CATEGORY_LABEL[cat]}
                </div>
                <MemberGrid members={list} accent={accent} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
        </>
      ) : (
        <MemberGrid members={members} accent={accent} onEdit={onEdit} onDelete={onDelete} />
      )}
    </div>
  );
}

function MemberGrid({
  members,
  accent,
  onEdit,
  onDelete,
}: {
  members: MemberRow[];
  accent: string;
  onEdit: (m: MemberRow) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12,
      }}
    >
      {members.map((m) => (
        <MemberCard
          key={m.id}
          member={m}
          accent={accent}
          onEdit={() => onEdit(m)}
          onDelete={() => onDelete(m.id, `${m.firstName} ${m.lastName}`)}
        />
      ))}
    </div>
  );
}

function MemberCard({
  member,
  accent,
  onEdit,
  onDelete,
}: {
  member: MemberRow;
  accent: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  const totals = memberTotals(member);
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${member.isFeatured ? LRH.gold : accent}`,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
      }}
    >
      {member.isFeatured && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            ...mono,
            fontSize: 8.5,
            fontWeight: 800,
            padding: '2px 6px',
            background: LRH.gold,
            color: LRH.navy,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          ● À la une
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {member.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photo}
            alt={`${member.firstName} ${member.lastName}`}
            style={{
              width: 48,
              height: 48,
              objectFit: 'cover',
              background: LRH.paperWarm,
              border: '1px solid ' + LRH.hairStrong,
            }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              background: LRH.navy,
              color: LRH.gold,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...display,
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...display,
              fontWeight: 700,
              fontSize: 14.5,
              color: LRH.navy,
              letterSpacing: '-0.01em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {member.firstName} {member.lastName}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 10,
              color: LRH.mute,
              letterSpacing: '0.12em',
              marginTop: 2,
            }}
          >
            #{member.license}
            {member.jerseyNumber != null ? ` · N°${member.jerseyNumber}` : ''}
          </div>
        </div>
      </div>

      {(member.position || member.birthdate) && (
        <div
          style={{
            ...body,
            fontSize: 12,
            color: LRH.ink2,
            paddingTop: 8,
            borderTop: '1px dashed ' + LRH.hair,
          }}
        >
          {member.position && (
            <div>
              <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.12em' }}>
                POSTE ·{' '}
              </span>
              {member.position}
            </div>
          )}
          {member.birthdate && (
            <div>
              <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, letterSpacing: '0.12em' }}>
                NÉ(E) ·{' '}
              </span>
              {new Date(member.birthdate).toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
      )}

      {member.kind === 'PLAYER' && (
        <div
          style={{
            display: 'flex',
            gap: 14,
            paddingTop: 8,
            borderTop: '1px dashed ' + LRH.hair,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div style={{ ...display, fontWeight: 800, fontSize: 18, color: LRH.navy, lineHeight: 1 }}>
              {totals.matchesPlayed}
            </div>
            <div
              style={{
                ...mono,
                fontSize: 8.5,
                color: LRH.mute,
                letterSpacing: '0.16em',
                marginTop: 2,
                fontWeight: 700,
              }}
            >
              MATCHS
            </div>
          </div>
          <div>
            <div style={{ ...display, fontWeight: 800, fontSize: 18, color: LRH.red, lineHeight: 1 }}>
              {totals.goalsScored}
            </div>
            <div
              style={{
                ...mono,
                fontSize: 8.5,
                color: LRH.mute,
                letterSpacing: '0.16em',
                marginTop: 2,
                fontWeight: 700,
              }}
            >
              BUTS
            </div>
          </div>
          {member.competitionStats.length > 0 && (
            <div style={{ marginLeft: 'auto' }}>
              <div
                style={{
                  ...mono,
                  fontSize: 9,
                  color: LRH.mute,
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {member.competitionStats.length} compét
                {member.competitionStats.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
        <button
          onClick={onEdit}
          style={{
            ...body,
            fontSize: 11.5,
            fontWeight: 700,
            padding: '6px 12px',
            background: LRH.navy,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Modifier
        </button>
        <button
          onClick={onDelete}
          style={{
            ...body,
            fontSize: 11.5,
            fontWeight: 700,
            padding: '6px 12px',
            background: '#fff',
            color: LRH.red,
            border: '1px solid ' + LRH.red,
            cursor: 'pointer',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Suppr.
        </button>
      </div>
    </div>
  );
}
