'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LRH, body, display, mono, ClubCrest, MODE_COLOR } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge, StatusBadge } from '@/components/lrh/Badge';
import { NotesPanel } from '../MatchesAdmin';
import {
  createGoal, deleteGoal,
  createCard, deleteCard,
  createInjury, deleteInjury,
} from '@/lib/actions/matchEvents';

type MemberRow = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
};

type GoalRow = {
  id: string;
  minute: number;
  scoringClubId: string;
  scorerName: string | null;
  scorerMemberId: string | null;
  kind: string | null;
  scorerMember: MemberRow | null;
};

type CardRow = {
  id: string;
  minute: number;
  kind: 'GREEN' | 'YELLOW' | 'RED';
  reason: string | null;
  clubId: string;
  memberId: string | null;
  memberName: string | null;
  member: MemberRow | null;
};

type InjuryRow = {
  id: string;
  minute: number;
  severity: 'LIGHT' | 'MODERATE' | 'SERIOUS';
  zone: string | null;
  notes: string | null;
  clubId: string;
  memberId: string | null;
  memberName: string | null;
  replacedByMemberId: string | null;
  member: MemberRow | null;
  replacedByMember: MemberRow | null;
};

type MatchPayload = {
  id: string;
  kickoffAt: Date;
  status: string;
  matchday: number | null;
  phase: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  homeClubId: string;
  awayClubId: string;
  organizerClubId: string | null;
  homeClub: { id: string; slug: string; shortCode: string | null; name: string };
  awayClub: { id: string; slug: string; shortCode: string | null; name: string };
  organizerClub: { id: string; slug: string; shortCode: string | null; name: string } | null;
  competition: { id: string; slug: string; name: string; season: string; mode: 'GAZON' | 'SALLE'; category: string };
  venueRef: { id: string; name: string; city: string } | null;
  goals: GoalRow[];
  cards: CardRow[];
  injuries: InjuryRow[];
  referees: { role: 'PRINCIPAL' | 'DELEGUE'; referee: { id: string; fullName: string } }[];
};

type TabKey = 'goals' | 'cards' | 'injuries' | 'notes';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
  padding: '8px 10px',
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
        fontSize: 9.5,
        fontWeight: 700,
        color: LRH.mute,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 5,
      }}
    >
      {children}
    </label>
  );
}

function memberLabel(m: MemberRow): string {
  const jersey = m.jerseyNumber != null ? `#${m.jerseyNumber} ` : '';
  return `${jersey}${m.firstName} ${m.lastName}`;
}

export function MatchDetailAdmin({
  match,
  homeMembers,
  awayMembers,
  isAdmin,
  currentUserId,
}: {
  match: MatchPayload;
  homeMembers: MemberRow[];
  awayMembers: MemberRow[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [tab, setTab] = useState<TabKey>('goals');
  const pal = MODE_COLOR[match.competition.mode];

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'goals',    label: 'Buteurs',  count: match.goals.length },
    { key: 'cards',    label: 'Cartons',  count: match.cards.length },
    { key: 'injuries', label: 'Blessures', count: match.injuries.length },
    { key: 'notes',    label: 'Notes',    count: 0 },
  ];

  const kickoff = new Date(match.kickoffAt);
  const dateLabel = kickoff.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const timeLabel = kickoff.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/matches/calendar"
        style={{
          ...mono,
          fontSize: 11,
          color: LRH.mute,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          marginBottom: 14,
        }}
      >
        ◂ Retour au calendrier
      </Link>

      {/* Header block */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `4px solid ${pal.bg}`,
          padding: '20px 22px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 10,
            flexWrap: 'wrap',
          }}
        >
          <ModeBadge mode={match.competition.mode} size="sm" />
          <CategoryBadge category={match.competition.category} size="sm" />
          <span style={{ ...mono, fontSize: 11, color: LRH.mute, letterSpacing: '0.06em' }}>
            {match.competition.season} · {match.competition.name}
            {match.matchday != null ? ` · J${String(match.matchday).padStart(2, '0')}` : ''}
            {match.phase !== 'REGULAR' ? ` · ${match.phase}` : ''}
          </span>
          <StatusBadge status={match.status as any} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClubCrest id={match.homeClub.shortCode ?? undefined} size={36} />
            <span style={{ ...display, fontWeight: 700, fontSize: 22, color: LRH.navy, letterSpacing: '-0.02em' }}>
              <span className="lrh-match-team-full">{match.homeClub.name}</span>
              <span className="lrh-match-team-short">
                {match.homeClub.shortCode ?? match.homeClub.name.replace(/^Entente\s+/i, '')}
              </span>
            </span>
          </div>
          <div
            style={{
              ...display,
              fontWeight: 800,
              fontSize: 36,
              color: LRH.navy,
              letterSpacing: '-0.04em',
              padding: '0 10px',
            }}
          >
            {match.homeScore ?? '—'}
            <span style={{ color: LRH.mute, margin: '0 10px' }}>:</span>
            {match.awayScore ?? '—'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...display, fontWeight: 700, fontSize: 22, color: LRH.navy, letterSpacing: '-0.02em' }}>
              <span className="lrh-match-team-full">{match.awayClub.name}</span>
              <span className="lrh-match-team-short">
                {match.awayClub.shortCode ?? match.awayClub.name.replace(/^Entente\s+/i, '')}
              </span>
            </span>
            <ClubCrest id={match.awayClub.shortCode ?? undefined} size={36} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 18,
            flexWrap: 'wrap',
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px dashed ' + LRH.hair,
          }}
        >
          <div style={{ ...mono, fontSize: 10.5, color: LRH.ink2, letterSpacing: '0.06em' }}>
            <span style={{ color: LRH.mute, marginRight: 6 }}>DATE</span>
            <span style={{ textTransform: 'capitalize' }}>{dateLabel}</span> · {timeLabel}
          </div>
          {(match.venueRef || match.venue) && (
            <div style={{ ...mono, fontSize: 10.5, color: LRH.ink2, letterSpacing: '0.06em' }}>
              <span style={{ color: LRH.mute, marginRight: 6 }}>TERRAIN</span>
              {match.venueRef ? `${match.venueRef.name} · ${match.venueRef.city}` : match.venue}
            </div>
          )}
          {match.organizerClub && (
            <div style={{ ...mono, fontSize: 10.5, color: LRH.ink2, letterSpacing: '0.06em' }}>
              <span style={{ color: LRH.mute, marginRight: 6 }}>ORGANISATEUR</span>
              <span className="lrh-match-team-full">{match.organizerClub.name}</span>
              <span className="lrh-match-team-short">
                {match.organizerClub.shortCode ?? match.organizerClub.name.replace(/^Entente\s+/i, '')}
              </span>
            </div>
          )}
          {match.referees.length > 0 && (
            <div style={{ ...mono, fontSize: 10.5, color: LRH.ink2, letterSpacing: '0.06em' }}>
              <span style={{ color: LRH.mute, marginRight: 6 }}>ARBITRAGE</span>
              {match.referees.map((r) => `${r.role === 'PRINCIPAL' ? 'Arb.' : 'Dél.'} ${r.referee.fullName}`).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid ' + LRH.hairStrong,
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                ...mono,
                fontSize: 11,
                fontWeight: 700,
                padding: '12px 18px',
                background: 'transparent',
                color: active ? LRH.navy : LRH.mute,
                border: 'none',
                borderBottom: active ? `3px solid ${LRH.gold}` : '3px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  style={{
                    ...mono,
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '1px 6px',
                    background: active ? LRH.navy : LRH.hairStrong,
                    color: active ? '#fff' : LRH.mute,
                    letterSpacing: '0.04em',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'goals' && (
        <GoalsTab match={match} homeMembers={homeMembers} awayMembers={awayMembers} isAdmin={isAdmin} />
      )}
      {tab === 'cards' && (
        <CardsTab match={match} homeMembers={homeMembers} awayMembers={awayMembers} isAdmin={isAdmin} />
      )}
      {tab === 'injuries' && (
        <InjuriesTab match={match} homeMembers={homeMembers} awayMembers={awayMembers} isAdmin={isAdmin} />
      )}
      {tab === 'notes' && (
        <NotesPanel matchId={match.id} currentUserId={currentUserId} isAdmin={isAdmin} />
      )}
    </div>
  );
}

/* ─────────────────────── GOALS TAB ─────────────────────── */

function GoalsTab({
  match, homeMembers, awayMembers, isAdmin,
}: {
  match: MatchPayload;
  homeMembers: MemberRow[];
  awayMembers: MemberRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [clubId, setClubId] = useState<string>(match.homeClubId);
  const [memberId, setMemberId] = useState('');
  const [scorerName, setScorerName] = useState('');
  const [minute, setMinute] = useState('');
  const [kind, setKind] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = clubId === match.homeClubId ? homeMembers : awayMembers;

  const reset = () => {
    setMemberId('');
    setScorerName('');
    setMinute('');
    setKind('');
    setError(null);
  };

  const submit = async () => {
    if (!minute || Number(minute) < 0) return setError('Minute requise.');
    setSaving(true);
    setError(null);
    try {
      await createGoal({
        matchId: match.id,
        scoringClubId: clubId,
        minute: Number(minute),
        scorerMemberId: memberId || null,
        scorerName: scorerName.trim() || null,
        kind: kind.trim() || null,
      });
      reset();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer ce but ?')) return;
    try {
      await deleteGoal(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* List */}
      {match.goals.length === 0 ? (
        <EmptyState text="Aucun but enregistré pour ce match." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {match.goals.map((g) => {
            const scoringClub = g.scoringClubId === match.homeClubId ? match.homeClub : match.awayClub;
            const scorerLabel = g.scorerMember
              ? memberLabel(g.scorerMember)
              : g.scorerName || '—';
            return (
              <EventRow
                key={g.id}
                minute={g.minute}
                clubName={scoringClub.name}
                clubShortCode={scoringClub.shortCode ?? undefined}
                accent={LRH.gold}
                tag={g.kind || 'But'}
                main={scorerLabel}
                isAdmin={isAdmin}
                onDelete={() => onDelete(g.id)}
              />
            );
          })}
        </div>
      )}

      {/* Form */}
      {isAdmin && (
        <FormBlock title="Ajouter un but">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <FieldLabel>Équipe</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={clubId}
                onChange={(e) => { setClubId(e.target.value); setMemberId(''); }}
              >
                <option value={match.homeClubId}>{match.homeClub.name}</option>
                <option value={match.awayClubId}>{match.awayClub.name}</option>
              </select>
            </div>
            <div>
              <FieldLabel>Buteur (roster)</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">— Choisir / Hors-roster —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Minute *</FieldLabel>
              <input
                type="number" min={0} max={200} style={inputStyle}
                value={minute} onChange={(e) => setMinute(e.target.value)}
                placeholder="32"
              />
            </div>
            <div>
              <FieldLabel>Type</FieldLabel>
              <input
                type="text" style={inputStyle}
                value={kind} onChange={(e) => setKind(e.target.value)}
                placeholder="action, PC, stroke, cb"
              />
            </div>
            <button
              type="button" onClick={submit} disabled={saving}
              style={btnAdd}
            >
              {saving ? '…' : '+ Ajouter'}
            </button>
          </div>
          {!memberId && (
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Buteur hors-roster (texte libre)</FieldLabel>
              <input
                type="text" style={inputStyle}
                value={scorerName} onChange={(e) => setScorerName(e.target.value)}
                placeholder="Nom du buteur si non licencié"
              />
            </div>
          )}
          {error && <ErrorMsg msg={error} />}
        </FormBlock>
      )}
    </div>
  );
}

/* ─────────────────────── CARDS TAB ─────────────────────── */

const CARD_KIND_COLOR: Record<'GREEN' | 'YELLOW' | 'RED', { bg: string; fg: string; label: string }> = {
  GREEN:  { bg: '#1d6b3f', fg: '#fff', label: 'Vert' },
  YELLOW: { bg: '#F3BC1C', fg: '#0F1B2E', label: 'Jaune' },
  RED:    { bg: '#A8202F', fg: '#fff', label: 'Rouge' },
};

function CardsTab({
  match, homeMembers, awayMembers, isAdmin,
}: {
  match: MatchPayload;
  homeMembers: MemberRow[];
  awayMembers: MemberRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [clubId, setClubId] = useState<string>(match.homeClubId);
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [minute, setMinute] = useState('');
  const [kind, setKind] = useState<'GREEN' | 'YELLOW' | 'RED'>('YELLOW');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = clubId === match.homeClubId ? homeMembers : awayMembers;

  const reset = () => {
    setMemberId(''); setMemberName(''); setMinute(''); setReason(''); setError(null);
  };

  const submit = async () => {
    if (!minute || Number(minute) < 0) return setError('Minute requise.');
    setSaving(true);
    setError(null);
    try {
      await createCard({
        matchId: match.id,
        clubId,
        memberId: memberId || null,
        memberName: memberName.trim() || null,
        minute: Number(minute),
        kind,
        reason: reason.trim() || null,
      });
      reset();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer ce carton ?')) return;
    try {
      await deleteCard(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {match.cards.length === 0 ? (
        <EmptyState text="Aucun carton enregistré pour ce match." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {match.cards.map((c) => {
            const club = c.clubId === match.homeClubId ? match.homeClub : match.awayClub;
            const playerLabel = c.member ? memberLabel(c.member) : c.memberName || '—';
            const palC = CARD_KIND_COLOR[c.kind];
            return (
              <EventRow
                key={c.id}
                minute={c.minute}
                clubName={club.name}
                clubShortCode={club.shortCode ?? undefined}
                accent={palC.bg}
                tag={`Carton ${palC.label}`}
                main={playerLabel}
                subline={c.reason ?? undefined}
                isAdmin={isAdmin}
                onDelete={() => onDelete(c.id)}
              />
            );
          })}
        </div>
      )}

      {isAdmin && (
        <FormBlock title="Ajouter un carton">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <FieldLabel>Équipe</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={clubId}
                onChange={(e) => { setClubId(e.target.value); setMemberId(''); }}
              >
                <option value={match.homeClubId}>{match.homeClub.name}</option>
                <option value={match.awayClubId}>{match.awayClub.name}</option>
              </select>
            </div>
            <div>
              <FieldLabel>Joueur (roster)</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">— Choisir / Hors-roster —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Minute *</FieldLabel>
              <input
                type="number" min={0} max={200} style={inputStyle}
                value={minute} onChange={(e) => setMinute(e.target.value)}
                placeholder="42"
              />
            </div>
            <div>
              <FieldLabel>Couleur</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
              >
                <option value="GREEN">Vert (2 min)</option>
                <option value="YELLOW">Jaune (5–10 min)</option>
                <option value="RED">Rouge (exclusion)</option>
              </select>
            </div>
            <button type="button" onClick={submit} disabled={saving} style={btnAdd}>
              {saving ? '…' : '+ Ajouter'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: !memberId ? '1fr 1fr' : '1fr', gap: 10, marginTop: 10 }}>
            {!memberId && (
              <div>
                <FieldLabel>Joueur hors-roster (texte libre)</FieldLabel>
                <input
                  type="text" style={inputStyle}
                  value={memberName} onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Nom du joueur si non licencié"
                />
              </div>
            )}
            <div>
              <FieldLabel>Raison (optionnel)</FieldLabel>
              <input
                type="text" style={inputStyle}
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Anti-jeu, faute brutale, etc."
              />
            </div>
          </div>
          {error && <ErrorMsg msg={error} />}
        </FormBlock>
      )}
    </div>
  );
}

/* ─────────────────────── INJURIES TAB ─────────────────────── */

const INJURY_SEVERITY_LABEL: Record<'LIGHT' | 'MODERATE' | 'SERIOUS', { label: string; color: string }> = {
  LIGHT:    { label: 'Légère',    color: LRH.mute },
  MODERATE: { label: 'Modérée',   color: '#d97706' },
  SERIOUS:  { label: 'Sérieuse',  color: LRH.red },
};

function InjuriesTab({
  match, homeMembers, awayMembers, isAdmin,
}: {
  match: MatchPayload;
  homeMembers: MemberRow[];
  awayMembers: MemberRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [clubId, setClubId] = useState<string>(match.homeClubId);
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [minute, setMinute] = useState('');
  const [zone, setZone] = useState('');
  const [severity, setSeverity] = useState<'LIGHT' | 'MODERATE' | 'SERIOUS'>('LIGHT');
  const [replacedById, setReplacedById] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = clubId === match.homeClubId ? homeMembers : awayMembers;

  const reset = () => {
    setMemberId(''); setMemberName(''); setMinute(''); setZone(''); setReplacedById(''); setNotes(''); setError(null);
  };

  const submit = async () => {
    if (!minute || Number(minute) < 0) return setError('Minute requise.');
    setSaving(true);
    setError(null);
    try {
      await createInjury({
        matchId: match.id,
        clubId,
        memberId: memberId || null,
        memberName: memberName.trim() || null,
        minute: Number(minute),
        zone: zone.trim() || null,
        severity,
        replacedByMemberId: replacedById || null,
        notes: notes.trim() || null,
      });
      reset();
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Supprimer cette blessure ?')) return;
    try {
      await deleteInjury(id);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || 'Erreur');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {match.injuries.length === 0 ? (
        <EmptyState text="Aucune blessure enregistrée pour ce match." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {match.injuries.map((inj) => {
            const club = inj.clubId === match.homeClubId ? match.homeClub : match.awayClub;
            const playerLabel = inj.member ? memberLabel(inj.member) : inj.memberName || '—';
            const sev = INJURY_SEVERITY_LABEL[inj.severity];
            const subline = [
              inj.zone,
              inj.replacedByMember ? `Remplacé par ${memberLabel(inj.replacedByMember)}` : null,
              inj.notes,
            ].filter(Boolean).join(' · ');
            return (
              <EventRow
                key={inj.id}
                minute={inj.minute}
                clubName={club.name}
                clubShortCode={club.shortCode ?? undefined}
                accent={sev.color}
                tag={`Blessure ${sev.label.toLowerCase()}`}
                main={playerLabel}
                subline={subline || undefined}
                isAdmin={isAdmin}
                onDelete={() => onDelete(inj.id)}
              />
            );
          })}
        </div>
      )}

      {isAdmin && (
        <FormBlock title="Ajouter une blessure">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10, alignItems: 'end' }}>
            <div>
              <FieldLabel>Équipe</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={clubId}
                onChange={(e) => { setClubId(e.target.value); setMemberId(''); setReplacedById(''); }}
              >
                <option value={match.homeClubId}>{match.homeClub.name}</option>
                <option value={match.awayClubId}>{match.awayClub.name}</option>
              </select>
            </div>
            <div>
              <FieldLabel>Joueur blessé (roster)</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="">— Choisir / Hors-roster —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Minute *</FieldLabel>
              <input
                type="number" min={0} max={200} style={inputStyle}
                value={minute} onChange={(e) => setMinute(e.target.value)}
                placeholder="58"
              />
            </div>
            <div>
              <FieldLabel>Gravité</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
              >
                <option value="LIGHT">Légère</option>
                <option value="MODERATE">Modérée</option>
                <option value="SERIOUS">Sérieuse</option>
              </select>
            </div>
            <button type="button" onClick={submit} disabled={saving} style={btnAdd}>
              {saving ? '…' : '+ Ajouter'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: !memberId ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginTop: 10 }}>
            {!memberId && (
              <div>
                <FieldLabel>Joueur hors-roster (texte libre)</FieldLabel>
                <input
                  type="text" style={inputStyle}
                  value={memberName} onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Nom du joueur si non licencié"
                />
              </div>
            )}
            <div>
              <FieldLabel>Zone (optionnel)</FieldLabel>
              <input
                type="text" style={inputStyle}
                value={zone} onChange={(e) => setZone(e.target.value)}
                placeholder="cheville, épaule, tête…"
              />
            </div>
            <div>
              <FieldLabel>Remplacé par (roster)</FieldLabel>
              <select
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={replacedById}
                onChange={(e) => setReplacedById(e.target.value)}
              >
                <option value="">— Aucun —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <FieldLabel>Notes (optionnel)</FieldLabel>
            <input
              type="text" style={inputStyle}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, traitement immédiat, etc."
            />
          </div>
          {error && <ErrorMsg msg={error} />}
        </FormBlock>
      )}
    </div>
  );
}

/* ─────────────────────── SHARED PIECES ─────────────────────── */

function EventRow({
  minute, clubName, clubShortCode, accent, tag, main, subline, isAdmin, onDelete,
}: {
  minute: number;
  clubName: string;
  clubShortCode?: string;
  accent: string;
  tag: string;
  main: string;
  subline?: string;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        borderLeft: `3px solid ${accent}`,
        padding: '10px 14px',
        display: 'grid',
        gridTemplateColumns: '54px 1fr auto',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          ...display,
          fontSize: 18,
          fontWeight: 800,
          color: LRH.navy,
          letterSpacing: '-0.02em',
          textAlign: 'right',
        }}
      >
        {minute}'
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span
            style={{
              ...mono,
              fontSize: 9.5,
              fontWeight: 800,
              padding: '2px 7px',
              background: accent,
              color: '#fff',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {tag}
          </span>
          <ClubCrest id={clubShortCode} size={16} />
          <span style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.06em' }}>
            <span className="lrh-match-team-full">{clubName}</span>
            <span className="lrh-match-team-short">
              {clubShortCode ?? clubName.replace(/^Entente\s+/i, '')}
            </span>
          </span>
        </div>
        <div style={{ ...body, fontSize: 14, color: LRH.ink, fontWeight: 600 }}>
          {main}
        </div>
        {subline && (
          <div style={{ ...body, fontSize: 12, color: LRH.mute, marginTop: 2 }}>
            {subline}
          </div>
        )}
      </div>
      {isAdmin && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            padding: '5px 9px',
            background: 'transparent',
            color: LRH.red,
            border: '1px solid ' + LRH.red,
            cursor: 'pointer',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Suppr.
        </button>
      )}
    </div>
  );
}

function FormBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: LRH.paperWarm,
        border: '1px dashed ' + LRH.hairStrong,
        padding: 18,
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10.5,
          fontWeight: 700,
          color: LRH.red,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        ▸ {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        ...mono,
        fontSize: 11.5,
        color: LRH.mute,
        letterSpacing: '0.08em',
        padding: '20px 18px',
        background: '#fff',
        border: '1px dashed ' + LRH.hairStrong,
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div
      style={{
        ...mono,
        fontSize: 11,
        color: LRH.red,
        marginTop: 10,
        padding: '8px 12px',
        background: 'rgba(168,32,47,0.08)',
        border: '1px solid rgba(168,32,47,0.2)',
      }}
    >
      ⚠ {msg}
    </div>
  );
}

const btnAdd: React.CSSProperties = {
  ...mono,
  fontSize: 11,
  fontWeight: 700,
  padding: '10px 14px',
  background: LRH.navy,
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};
