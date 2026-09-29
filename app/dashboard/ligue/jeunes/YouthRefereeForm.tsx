'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { FormDialog } from '@/components/lrh/dashboard/FormDialog';
import { errorMessage } from '@/lib/utils/error-message';
import { formatMatchDay } from '@/lib/utils/match-format';
import { formatReunionTime, reunionDayKey } from '@/lib/utils/datetime-reunion';
import { matchTitle } from '@/lib/utils/match-side';
import { createYouthRefereeDuties } from '@/lib/actions/youth';
import type { YouthRefereeMatchOption } from '@/lib/queries/youth';
import { inputStyle, btnPrimary, btnGhost, FieldLabel } from './adminStyles';

/** Les dates traversent le RSC : `Date` ou chaîne selon le chemin. */
type MatchOption = Omit<YouthRefereeMatchOption, 'kickoffAt'> & { kickoffAt: Date | string };

const OUTSIDE = '__hors-championnat';

/** Libellé d'une rencontre dans le sélecteur : « 09:00 · U10-U12 · AZO – HHS 2-1 ». */
export function matchOptionLabel(m: MatchOption): string {
  const score = m.homeScore != null && m.awayScore != null ? ` ${m.homeScore}-${m.awayScore}` : '';
  return `${formatReunionTime(m.kickoffAt)} · ${m.competition.category} · ${matchTitle(m, { short: true })}${score}`;
}

/**
 * Saisie d'arbitrages jeunes : une rencontre, un ou plusieurs arbitres.
 *
 * Pensé pour recopier une feuille de rassemblement vite : la rencontre se
 * choisit dans les matchs jeunes déjà saisis (saison, discipline et date en
 * découlent côté serveur), et les noms déjà connus sont proposés en un clic —
 * c'est ce qui évite qu'un « Mahe » sans accent crée un deuxième arbitre au
 * classement public.
 */
export function YouthRefereeCreateForm({
  matches,
  seasons,
  defaultSeason,
  knownNames,
  onClose,
  onSaved,
}: {
  matches: MatchOption[];
  seasons: string[];
  defaultSeason: string;
  knownNames: string[];
  onClose: () => void;
  onSaved: (created: number) => void;
}) {
  const [matchId, setMatchId] = useState<string>(matches[0]?.id ?? OUTSIDE);
  const [names, setNames] = useState('');
  const [season, setSeason] = useState(defaultSeason);
  const [date, setDate] = useState('');
  const [mode, setMode] = useState<'GAZON' | 'SALLE'>('GAZON');
  const [context, setContext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Le message d'erreur est en tête du formulaire : sur un petit écran il est
  // hors de vue au moment du clic sur « Enregistrer ». On l'y ramène.
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [error]);

  // Rencontres groupées par jour, le plus récent d'abord (ordre de la query).
  const byDay = useMemo(() => {
    const groups = new Map<string, MatchOption[]>();
    for (const m of matches) {
      const key = reunionDayKey(m.kickoffAt);
      const list = groups.get(key) ?? [];
      list.push(m);
      groups.set(key, list);
    }
    // Dans une journée, ordre chronologique : celui de la feuille.
    return [...groups.values()].map((list) =>
      [...list].sort((a, b) => +new Date(a.kickoffAt) - +new Date(b.kickoffAt)),
    );
  }, [matches]);

  const outside = matchId === OUTSIDE;

  const addName = (name: string) => {
    const current = names.split(',').map((n) => n.trim()).filter(Boolean);
    if (current.some((n) => n.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) return;
    setNames([...current, name].join(', '));
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await createYouthRefereeDuties(
        outside
          ? { matchId: null, season, date, mode, context, names }
          : { matchId, names },
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onSaved(result.created ?? 0);
    } catch (e) {
      setError(errorMessage(e, "Erreur lors de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      busy={saving}
      size="wide"
      title="Saisir des arbitrages"
      footer={
        <>
          <button style={btnGhost} disabled={saving} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} disabled={saving} onClick={submit}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      {error && (
        <div ref={errorRef} role="alert" style={{
          ...body, fontSize: 13, color: LRH.red,
          background: 'rgba(168,32,47,0.07)', border: '1px solid ' + LRH.red,
          padding: '10px 12px', marginBottom: 14,
        }}>{error}</div>
      )}

      <FieldLabel htmlFor="yr-match">Rencontre arbitrée *</FieldLabel>
      <select
        id="yr-match"
        style={{ ...inputStyle, cursor: 'pointer' }}
        value={matchId}
        onChange={(e) => setMatchId(e.target.value)}
      >
        {byDay.map((list) => (
          <optgroup key={list[0].id} label={formatMatchDay(new Date(list[0].kickoffAt))}>
            {list.map((m) => (
              <option key={m.id} value={m.id}>{matchOptionLabel(m)}</option>
            ))}
          </optgroup>
        ))}
        <option value={OUTSIDE}>Hors championnat (match interne, amical…)</option>
      </select>
      <div style={{ ...body, fontSize: 11.5, color: LRH.mute, marginTop: 6 }}>
        La rencontre doit d&apos;abord exister dans le calendrier. Une rencontre
        hors classement compte quand même au classement des arbitres.
      </div>

      {outside && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: 14, marginTop: 14,
        }}>
          <div>
            <FieldLabel htmlFor="yr-season">Saison *</FieldLabel>
            <input
              id="yr-season"
              list="yr-seasons"
              style={inputStyle}
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            />
            <datalist id="yr-seasons">
              {seasons.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <FieldLabel htmlFor="yr-date">Date *</FieldLabel>
            <input
              id="yr-date"
              type="date"
              style={inputStyle}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="yr-mode">Discipline *</FieldLabel>
            <select
              id="yr-mode"
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={mode}
              onChange={(e) => setMode(e.target.value as 'GAZON' | 'SALLE')}
            >
              <option value="GAZON">Gazon</option>
              <option value="SALLE">Salle</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldLabel htmlFor="yr-context">Rencontre *</FieldLabel>
            <input
              id="yr-context"
              style={inputStyle}
              placeholder="Match interne HHS · Rouges 1-0 Chasubles"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <FieldLabel htmlFor="yr-names">Arbitre(s) *</FieldLabel>
        <input
          id="yr-names"
          style={inputStyle}
          placeholder="Mahé — plusieurs : Clément, Ryan"
          value={names}
          onChange={(e) => setNames(e.target.value)}
          autoComplete="off"
        />
        <div style={{ ...body, fontSize: 11.5, color: LRH.mute, marginTop: 6 }}>
          Le nom tel qu&apos;il figure sur la feuille. Plusieurs arbitres : séparer
          par une virgule, chacun compte un match.
        </div>
      </div>

      {knownNames.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
          }}>Déjà saisis — cliquer pour ajouter</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {knownNames.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => addName(n)}
                style={{
                  ...body, fontSize: 12.5, fontWeight: 600,
                  padding: '0 12px', minHeight: 36,
                  background: '#fff', color: LRH.navy,
                  border: '1px solid ' + LRH.hairStrong, borderRadius: 4,
                  cursor: 'pointer',
                }}
              >+ {n}</button>
            ))}
          </div>
        </div>
      )}
    </FormDialog>
  );
}
