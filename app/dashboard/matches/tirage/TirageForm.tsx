'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { ModeBadge, CategoryBadge } from '@/components/lrh/Badge';
import {
  generateRoundRobin,
  listMatchesForCompetitionSummary,
  type ClubForAdmin,
  type CompetitionAdminRow,
  type MatchSummaryRow,
} from '@/lib/actions/competition';

const inputStyle: React.CSSProperties = {
  ...body,
  fontSize: 13,
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
  padding: '10px 16px',
  borderRadius: 4,
  background: 'transparent',
  color: LRH.navy,
  border: '1px solid ' + LRH.navy,
  cursor: 'pointer',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
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

type Pair = { home: string; away: string };

// Génère localement (mêmes règles que côté server) pour l'aperçu.
function buildSchedule(teamIds: string[], doubleRound: boolean): Pair[][] {
  if (teamIds.length < 2) return [];
  const hasBye = teamIds.length % 2 === 1;
  const list: (string | null)[] = hasBye ? [...teamIds, null] : [...teamIds];
  const n = list.length;
  const rounds = n - 1;

  const schedule: Pair[][] = [];
  let rotating = [...list];
  for (let r = 0; r < rounds; r++) {
    const journee: Pair[] = [];
    for (let i = 0; i < n / 2; i++) {
      let home = rotating[i];
      let away = rotating[n - 1 - i];
      if (r % 2 === 1) {
        const tmp = home;
        home = away;
        away = tmp;
      }
      if (home != null && away != null) journee.push({ home, away });
    }
    schedule.push(journee);
    rotating = [rotating[0], rotating[n - 1], ...rotating.slice(1, n - 1)];
  }
  if (doubleRound) {
    const retour: Pair[][] = schedule.map((j) =>
      j.map(({ home, away }) => ({ home: away, away: home })),
    );
    schedule.push(...retour);
  }
  return schedule;
}

function shuffleArray<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function TirageForm({
  competitions,
  clubs,
  entriesByCompetition,
  initialCompetitionId,
}: {
  competitions: CompetitionAdminRow[];
  clubs: ClubForAdmin[];
  entriesByCompetition: Record<string, string[]>;
  initialCompetitionId?: string;
}) {
  const router = useRouter();

  const [competitionId, setCompetitionId] = useState<string>(initialCompetitionId ?? '');
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [kickoffTime, setKickoffTime] = useState<string>('14:00');
  const [interval, setIntervalValue] = useState<number>(1);
  const [intervalUnit, setIntervalUnit] = useState<'hour' | 'day' | 'week'>('week');
  const [doubleRound, setDoubleRound] = useState<boolean>(false);
  const [shuffleEnabled, setShuffleEnabled] = useState<boolean>(false);
  const [showAllClubs, setShowAllClubs] = useState<boolean>(false);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCompetition = useMemo(
    () => competitions.find((c) => c.id === competitionId),
    [competitions, competitionId],
  );

  // Nombre de matchs déjà créés sur la compétition (lu depuis le _count
  // exposé par listCompetitionsAdmin). Sert à afficher l'avertissement
  // « la compé contient déjà X matchs » + la case Remplacer.
  const existingMatchCount = selectedCompetition?._count.matches ?? 0;

  // Reset le toggle "Remplacer" si on change de compétition (sécurité — sinon
  // on pourrait cocher Remplacer sur compé A puis basculer sur compé B en
  // gardant la case active).
  React.useEffect(() => {
    setReplaceExisting(false);
    // Pré-cocher "aller-retour" selon le flag stocké sur la compétition
    // (l'admin a fixé sa préférence dans le form de compétition).
    if (selectedCompetition?.doubleRound !== undefined) {
      setDoubleRound(selectedCompetition.doubleRound);
    }
  }, [competitionId, selectedCompetition?.doubleRound]);

  // Aperçu des matchs existants (chargé au changement de compé). Sert à
  // identifier visuellement les matchs avant de cocher "Remplacer" —
  // l'admin peut spotter une confusion entre deux compés au nom proche.
  const [existingMatches, setExistingMatches] = useState<MatchSummaryRow[]>([]);
  React.useEffect(() => {
    if (!competitionId || existingMatchCount === 0) {
      setExistingMatches([]);
      return;
    }
    let alive = true;
    listMatchesForCompetitionSummary(competitionId)
      .then((rows) => {
        if (alive) setExistingMatches(rows);
      })
      .catch(() => {
        if (alive) setExistingMatches([]);
      });
    return () => {
      alive = false;
    };
  }, [competitionId, existingMatchCount]);

  // Clubs éligibles : par défaut, restreint aux inscrits à la compétition.
  // Si pas d'inscriptions OU si l'admin force "tous les clubs" via le toggle,
  // on affiche l'annuaire complet (utile pour les coupes ouvertes).
  const entryIds = useMemo(
    () => (competitionId ? entriesByCompetition[competitionId] ?? [] : []),
    [competitionId, entriesByCompetition],
  );

  const eligibleClubs = useMemo(() => {
    if (!competitionId) return clubs;
    if (showAllClubs) return clubs;
    if (entryIds.length === 0) return clubs;
    const set = new Set(entryIds);
    return clubs.filter((c) => set.has(c.id));
  }, [clubs, competitionId, entryIds, showAllClubs]);

  // Reset sélection si la compétition change
  React.useEffect(() => {
    setSelectedClubIds([]);
  }, [competitionId]);

  // Aperçu : on respecte l'ordre courant de selectedClubIds. Si l'utilisateur
  // a cliqué « Tirage au sort », on a déjà mélangé selectedClubIds.
  const previewSchedule = useMemo(
    () => buildSchedule(selectedClubIds, doubleRound),
    [selectedClubIds, doubleRound],
  );

  const totalMatches = previewSchedule.reduce((acc, j) => acc + j.length, 0);

  // Date de chaque journée pour l'aperçu (même calcul que côté server).
  const journeeDates = useMemo(() => {
    if (!startDate) return previewSchedule.map(() => null);
    // startDate ('YYYY-MM-DD') + kickoffTime ('HH:mm') interprétés comme heure
    // locale Réunion (UTC+4), même TZ que celle utilisée par le server à la
    // création. Évite tout décalage entre preview et résultat persisté.
    const base = new Date(`${startDate}T${kickoffTime}:00+04:00`);
    const unitMs =
      intervalUnit === 'hour' ? 60 * 60 * 1000
      : intervalUnit === 'day' ? 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;
    const stepMs = interval * unitMs;
    return previewSchedule.map((_, idx) => new Date(base.getTime() + idx * stepMs));
  }, [startDate, kickoffTime, interval, intervalUnit, previewSchedule]);

  const toggleClub = (id: string) => {
    setSelectedClubIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelectedClubIds(eligibleClubs.map((c) => c.id));
  const selectNone = () => setSelectedClubIds([]);

  const drawLots = () => {
    if (selectedClubIds.length < 2) {
      setError('Sélectionnez au moins 2 équipes avant de procéder au tirage.');
      return;
    }
    setError(null);
    setShuffleEnabled(true);
    setSelectedClubIds((prev) => shuffleArray(prev));
  };

  const clubNameById = useMemo(() => {
    const map = new Map<string, ClubForAdmin>();
    for (const c of clubs) map.set(c.id, c);
    return map;
  }, [clubs]);

  const submit = async () => {
    if (!competitionId) {
      setError('Choisissez une compétition.');
      return;
    }
    if (selectedClubIds.length < 2) {
      setError('Sélectionnez au moins 2 équipes.');
      return;
    }
    if (!startDate) {
      setError('Date de la première journée requise.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // On envoie l'ordre courant ; côté server le shuffle re-mélange si l'utilisateur
      // a coché shuffle MAIS n'a pas cliqué le bouton de tirage. Sinon l'ordre client
      // est respecté (le bouton tirage a déjà mélangé selectedClubIds).
      const res = await generateRoundRobin({
        competitionId,
        clubIds: selectedClubIds,
        startDate,
        kickoffTime,
        interval,
        intervalUnit,
        doubleRound,
        shuffle: false, // l'ordre est déjà tiré côté client si l'utilisateur l'a voulu
        replaceExisting,
      });
      router.push(`/dashboard/matches?generated=${res.created}`);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la génération');
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Compétition + Options */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${LRH.navy}`,
          padding: 'clamp(16px, 3vw, 24px)',
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
            marginBottom: 18,
          }}
        >
          ▸ Compétition & paramètres
        </div>

        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Compétition *</FieldLabel>
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— Choisir une compétition —</option>
            {competitions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.season} · {c.mode} · {c.category}
              </option>
            ))}
          </select>
          {selectedCompetition && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <ModeBadge mode={selectedCompetition.mode} size="sm" />
              <CategoryBadge category={selectedCompetition.category} size="sm" />
              <span style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>
                {existingMatchCount} match
                {existingMatchCount > 1 ? 's' : ''} existant
                {existingMatchCount > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {existingMatchCount > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                background: 'rgba(168,32,47,0.06)',
                border: '1px solid rgba(168,32,47,0.22)',
                borderLeft: `3px solid ${LRH.red}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  ...mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: LRH.red,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                ⚠ Compétition non vide
              </div>
              <div style={{ ...body, fontSize: 12.5, color: LRH.ink2, lineHeight: 1.5 }}>
                {existingMatchCount} match{existingMatchCount > 1 ? 's existent' : ' existe'} déjà
                dans cette compétition. Vous ne pouvez pas générer sans gérer ce conflit —
                soit supprimer les anciens, soit cocher l'option ci-dessous.
              </div>

              {existingMatches.length > 0 && (
                <div
                  className="lrh-tirage-existing-list"
                  style={{ marginTop: 4, border: '1px solid ' + LRH.hair }}
                >
                  {existingMatches.slice(0, 20).map((m) => {
                    const date = new Date(m.kickoffAt);
                    const dateStr = date.toLocaleDateString('fr-FR', {
                      timeZone: 'Indian/Reunion',
                      day: '2-digit', month: 'short', year: 'numeric',
                    });
                    const timeStr = date.toLocaleTimeString('fr-FR', {
                      timeZone: 'Indian/Reunion',
                      hour: '2-digit', minute: '2-digit',
                    });
                    const home = m.homeClub.shortCode ?? m.homeClub.name;
                    const away = m.awayClub.shortCode ?? m.awayClub.name;
                    const score =
                      m.status === 'FINISHED' && m.homeScore != null && m.awayScore != null
                        ? `${m.homeScore}-${m.awayScore}`
                        : null;
                    return (
                      <a
                        key={m.id}
                        href={`/dashboard/matches/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lrh-tirage-existing-row"
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid ' + LRH.hair,
                          textDecoration: 'none',
                          color: 'inherit',
                          ...mono,
                          fontSize: 11,
                        }}
                      >
                        <span style={{ color: LRH.mute, letterSpacing: '0.06em' }}>
                          {dateStr} {timeStr}
                        </span>
                        <span style={{ color: LRH.navy, fontWeight: 700, letterSpacing: '0.04em' }}>
                          {m.matchday != null ? `J${m.matchday.toString().padStart(2, '0')}` : '—'}
                        </span>
                        <span style={{ color: LRH.ink, fontWeight: 600, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                          {home} <span style={{ color: LRH.mute, fontWeight: 400 }}>vs</span> {away}
                        </span>
                        <span
                          style={{
                            color: m.status === 'FINISHED' ? '#1d6b3f' : LRH.mute,
                            letterSpacing: '0.08em',
                          }}
                        >
                          {score ?? m.status}
                        </span>
                      </a>
                    );
                  })}
                  {existingMatches.length > 20 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        ...mono,
                        fontSize: 10.5,
                        color: LRH.mute,
                        letterSpacing: '0.08em',
                        textAlign: 'center',
                      }}
                    >
                      … et {existingMatches.length - 20} autres
                    </div>
                  )}
                </div>
              )}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span
                  style={{
                    ...mono,
                    fontSize: 11,
                    fontWeight: 700,
                    color: LRH.red,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  Remplacer les {existingMatchCount} match{existingMatchCount > 1 ? 's' : ''} existant{existingMatchCount > 1 ? 's' : ''} (irréversible)
                </span>
              </label>
              <div
                style={{
                  ...mono,
                  fontSize: 10,
                  color: LRH.mute,
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}
              >
                ↳ Les matchs déjà <strong>terminés</strong> bloquent le remplacement
                (protection des résultats officiels). Supprimez-les manuellement avant.
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
            gap: 14,
          }}
        >
          <div>
            <FieldLabel>Date de la 1re journée *</FieldLabel>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Heure de coup d'envoi</FieldLabel>
            <input
              type="time"
              value={kickoffTime}
              onChange={(e) => setKickoffTime(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Intervalle entre journées</FieldLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="number"
                min={1}
                max={60}
                value={interval}
                onChange={(e) =>
                  setIntervalValue(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
                }
                style={{ ...inputStyle, flex: '0 0 80px' }}
              />
              <select
                value={intervalUnit}
                onChange={(e) => setIntervalUnit(e.target.value as 'hour' | 'day' | 'week')}
                style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}
              >
                <option value="hour">heure{interval > 1 ? 's' : ''}</option>
                <option value="day">jour{interval > 1 ? 's' : ''}</option>
                <option value="week">semaine{interval > 1 ? 's' : ''}</option>
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Format</FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { v: false, label: 'Aller simple' },
                { v: true, label: 'Aller-retour' },
              ].map((opt) => {
                const isActive = doubleRound === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    type="button"
                    onClick={() => setDoubleRound(opt.v)}
                    style={{
                      flex: 1,
                      ...body,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '10px 8px',
                      borderRadius: 4,
                      background: isActive ? LRH.navy : '#fff',
                      color: isActive ? '#fff' : LRH.ink2,
                      border: `1px solid ${isActive ? LRH.navy : LRH.hairStrong}`,
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Sélection des équipes */}
      <div
        style={{
          background: '#fff',
          border: '1px solid ' + LRH.hair,
          borderLeft: `3px solid ${LRH.gold}`,
          padding: 'clamp(16px, 3vw, 24px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 12,
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
            }}
          >
            ▸ Équipes participantes ({selectedClubIds.length}/{eligibleClubs.length})
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={selectAll} style={btnGhost}>
              Tout cocher
            </button>
            <button type="button" onClick={selectNone} style={btnGhost}>
              Tout décocher
            </button>
            <button
              type="button"
              onClick={drawLots}
              disabled={selectedClubIds.length < 2}
              style={{
                ...body,
                fontSize: 12.5,
                fontWeight: 700,
                padding: '10px 16px',
                borderRadius: 4,
                background: LRH.gold,
                color: LRH.navy,
                border: 'none',
                cursor: selectedClubIds.length < 2 ? 'not-allowed' : 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: selectedClubIds.length < 2 ? 0.5 : 1,
              }}
            >
              ◎ Tirage au sort
            </button>
          </div>
        </div>

        {/* Source de la liste + override : indispensable quand l'admin
            ne maintient pas une table d'inscriptions (coupes ouvertes). */}
        {competitionId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              background: LRH.paperWarm,
              border: '1px solid ' + LRH.hair,
              marginBottom: 14,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                ...mono,
                fontSize: 10.5,
                color: LRH.mute,
                letterSpacing: '0.08em',
                flex: 1,
                minWidth: 200,
              }}
            >
              {entryIds.length === 0
                ? `Aucune inscription déclarée pour cette compétition — les ${clubs.length} clubs sont affichés.`
                : showAllClubs
                  ? `Affichage de tous les clubs (${clubs.length}). ${entryIds.length} sont officiellement inscrits.`
                  : `Filtré sur les ${entryIds.length} club${entryIds.length > 1 ? 's' : ''} inscrit${entryIds.length > 1 ? 's' : ''} à cette compétition.`}
            </span>
            {entryIds.length > 0 && (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  ...mono,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: LRH.navy,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <input
                  type="checkbox"
                  checked={showAllClubs}
                  onChange={(e) => setShowAllClubs(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: 'pointer' }}
                />
                Afficher tous les clubs
              </label>
            )}
          </div>
        )}

        {eligibleClubs.length === 0 ? (
          <div
            style={{
              padding: 18,
              background: LRH.paperWarm,
              border: '1px dashed ' + LRH.hairStrong,
              ...body,
              fontSize: 13,
              color: LRH.mute,
              textAlign: 'center',
            }}
          >
            {competitionId
              ? 'Aucun club inscrit à cette compétition. Inscrivez des clubs depuis Compétitions → Inscriptions.'
              : 'Choisissez d\'abord une compétition.'}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: 8,
            }}
          >
            {eligibleClubs.map((club) => {
              const isSelected = selectedClubIds.includes(club.id);
              const orderIndex = selectedClubIds.indexOf(club.id);
              return (
                <label
                  key={club.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: isSelected ? 'rgba(243,188,28,0.10)' : '#fff',
                    border: `1px solid ${isSelected ? LRH.gold : LRH.hair}`,
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClub(club.id)}
                    style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        ...body,
                        fontSize: 13,
                        fontWeight: 600,
                        color: LRH.ink,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {club.shortCode ? `[${club.shortCode}] ` : ''}
                      {club.name}
                    </div>
                    <div
                      style={{
                        ...mono,
                        fontSize: 10,
                        color: LRH.mute,
                        letterSpacing: '0.06em',
                        marginTop: 2,
                      }}
                    >
                      {club.city}
                    </div>
                  </div>
                  {isSelected && shuffleEnabled && (
                    <div
                      style={{
                        ...mono,
                        fontSize: 10,
                        fontWeight: 700,
                        color: LRH.navy,
                        background: LRH.gold,
                        padding: '2px 6px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      #{(orderIndex + 1).toString().padStart(2, '0')}
                    </div>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Aperçu */}
      {previewSchedule.length > 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid ' + LRH.hair,
            borderLeft: `3px solid ${LRH.red}`,
            padding: 'clamp(16px, 3vw, 24px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
              marginBottom: 14,
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
              }}
            >
              ▸ Aperçu du calendrier
            </div>
            <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: '0.1em' }}>
              {previewSchedule.length} journée{previewSchedule.length > 1 ? 's' : ''} ·{' '}
              {totalMatches} match{totalMatches > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {previewSchedule.map((journee, idx) => {
              const d = journeeDates[idx];
              const dateLabel = d
                ? d.toLocaleDateString('fr-FR', {
                    timeZone: 'Indian/Reunion',
                    weekday: 'short', day: '2-digit', month: 'short',
                  }) + ' · ' + d.toLocaleTimeString('fr-FR', {
                    timeZone: 'Indian/Reunion',
                    hour: '2-digit', minute: '2-digit',
                  })
                : null;
              return (
              <div key={idx}>
                <div
                  style={{
                    display: 'flex', alignItems: 'baseline', gap: 10,
                    marginBottom: 6, flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      ...mono,
                      fontSize: 10,
                      fontWeight: 700,
                      color: LRH.navy,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Journée {(idx + 1).toString().padStart(2, '0')}
                  </span>
                  {dateLabel && (
                    <span
                      style={{
                        ...mono, fontSize: 10, color: LRH.mute,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {dateLabel}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: 6,
                  }}
                >
                  {journee.map((pair, pi) => {
                    const home = clubNameById.get(pair.home);
                    const away = clubNameById.get(pair.away);
                    return (
                      <div
                        key={pi}
                        style={{
                          padding: '8px 12px',
                          background: LRH.paperWarm,
                          border: '1px solid ' + LRH.hair,
                          ...body,
                          fontSize: 12.5,
                          color: LRH.ink2,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{home?.shortCode ?? home?.name ?? '—'}</span>
                        <span style={{ ...mono, fontSize: 10, color: LRH.mute }}>vs</span>
                        <span style={{ fontWeight: 600 }}>{away?.shortCode ?? away?.name ?? '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            ...mono,
            fontSize: 12,
            color: LRH.red,
            padding: '12px 16px',
            background: 'rgba(168,32,47,0.08)',
            border: '1px solid rgba(168,32,47,0.2)',
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={submit} disabled={saving} style={btnPrimary}>
          {saving
            ? 'Génération…'
            : `Générer ${totalMatches} match${totalMatches > 1 ? 's' : ''}`}
        </button>
        <Link href="/dashboard/matches" style={{ textDecoration: 'none' }}>
          <button
            type="button"
            disabled={saving}
            style={{
              ...body,
              fontSize: 12.5,
              fontWeight: 700,
              padding: '12px 20px',
              borderRadius: 4,
              background: 'transparent',
              color: LRH.mute,
              border: '1px solid ' + LRH.hairStrong,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Annuler
          </button>
        </Link>
      </div>
    </div>
  );
}
