'use client';

import React, { useState, useEffect } from 'react';
import { LRH, display, mono, body } from '@/components/lrh/tokens';
import {
  addCompetitionToCalendar,
} from '@/lib/actions/draftCalendar';
import type {
  CompetitionOption,
} from './types';
import { inputStyle, labelStyle, btnPrimary, btnOutline, COMP_PALETTE } from './styles';
import { formatShortDate, matchdaysForTeamCount, computePreviewDates, nthMatchdayISO, nextTargetDayAfterISO } from './dates';
import { MatchdaysHint } from './MatchdaysHint';

// ---------------------------------------------------------------------------
// Add competition form (single-add with preview)
// ---------------------------------------------------------------------------

export function AddCompetitionForm({
  calendarId,
  calSeason,
  seasonHasComps,
  calStartDate,
  calEndDate,
  calDayOfWeek,
  calRecurrence,
  availableComps,
  compToCalendarName,
  existingCount,
  lastScheduledDateISO,
  onDone,
  onCancel,
  startTransition,
}: {
  calendarId: string;
  calSeason: string;
  seasonHasComps: boolean;
  calStartDate: string;
  calEndDate: string;
  calDayOfWeek: 'SATURDAY' | 'SUNDAY';
  calRecurrence: number;
  availableComps: CompetitionOption[];
  compToCalendarName: Map<string, string>;
  existingCount: number;
  lastScheduledDateISO?: string;
  onDone: () => void;
  onCancel: () => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [compId, setCompId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<'SATURDAY' | 'SUNDAY'>(calDayOfWeek);
  const [recurrence, setRecurrence] = useState(calRecurrence);
  const [startDate, setStartDate] = useState(calStartDate);
  const [matchdayCount, setMatchdayCount] = useState(6);
  const [countTouched, setCountTouched] = useState(false);
  const [chain, setChain] = useState(false);
  const [slotsPerDay, setSlotsPerDay] = useState(1);
  const [error, setError] = useState('');

  const selectedComp = availableComps.find((c) => c.id === compId) ?? null;

  // Pré-remplit le nombre de journées avec la projection round-robin dès qu'une
  // compétition avec des inscrits est choisie (tant que l'admin n'a pas saisi
  // sa propre valeur).
  //
  // ⚠️ `react-hooks/purity` signale ce `setState` synchrone dans un effet (rendu
  // en cascade). La réécriture en valeur dérivée au rendu a été tentée puis
  // ANNULÉE : elle change le comportement dans un cas limite — passer d'une
  // compétition à ≥2 inscrits vers une compétition à <2 inscrits laisse
  // aujourd'hui la dernière suggestion affichée, alors que la version dérivée
  // retombe sur la valeur par défaut (6). Différence non vérifiable au
  // navigateur avec le jeu de données local (les 14 compétitions sont déjà
  // rattachées), donc non embarquée dans un commit de découpage. Cf. règle n°1.
  useEffect(() => {
    if (!selectedComp || countTouched) return;
    const entries = selectedComp._count.entries;
    if (entries >= 2) {
      setMatchdayCount(matchdaysForTeamCount(entries, selectedComp.doubleRound ?? false));
    }
  }, [selectedComp, countTouched]);

  // « Enchaîner » : la date de début se cale sur le 1er jour cible après la
  // dernière journée déjà planifiée. Sinon, la date saisie à la main.
  const canChain = !!lastScheduledDateISO;
  const effectiveStart = chain && lastScheduledDateISO
    ? nextTargetDayAfterISO(dayOfWeek, lastScheduledDateISO)
    : startDate;

  // Date de fin DÉDUITE du nombre de journées (au lieu d'être saisie).
  const computedEndISO = nthMatchdayISO(dayOfWeek, recurrence, effectiveStart, matchdayCount);
  const exceedsWindow = !!computedEndISO && !!calEndDate && computedEndISO > calEndDate;
  const previewEnd = exceedsWindow ? calEndDate : computedEndISO;
  const previewDates = compId ? computePreviewDates(dayOfWeek, recurrence, effectiveStart, previewEnd) : [];
  const autoColor = COMP_PALETTE[existingCount % COMP_PALETTE.length];

  const handleAdd = () => {
    setError('');
    if (!compId) { setError('Choisissez une compétition.'); return; }
    if (!effectiveStart) { setError('Date de début requise.'); return; }
    if (matchdayCount < 1) { setError('Indiquez au moins une journée.'); return; }
    if (previewDates.length === 0) { setError('Aucune date ne correspond — vérifiez la date de début et le jour choisi.'); return; }

    startTransition(async () => {
      try {
        await addCompetitionToCalendar(calendarId, {
          competitionId: compId,
          startDate: effectiveStart,
          endDate: computedEndISO,
          slotsPerDay,
          dayOfWeek,
          recurrence,
        });
        onDone();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    });
  };

  return (
    <div style={{
      background: '#fff', border: `1px solid ${LRH.hair}`,
      borderLeft: `4px solid ${LRH.gold}`,
      padding: 20, marginTop: 16, marginBottom: 16,
    }}>
      <div style={{ ...display, fontSize: 16, fontWeight: 700, color: LRH.navy, marginBottom: 4 }}>
        Ajouter une compétition
      </div>
      <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 16 }}>
        Choisissez une compétition, indiquez son <strong>nombre de journées</strong> :
        la date de fin et les dates sont calculées automatiquement. Cochez «&nbsp;Enchaîner&nbsp;»
        pour démarrer juste après la dernière journée déjà planifiée.
      </div>

      {error && (
        <div style={{
          ...body, fontSize: 13, color: LRH.red, marginBottom: 12,
          padding: '8px 12px', background: 'rgba(168,32,47,0.06)',
          border: `1px solid ${LRH.red}`,
        }}>
          {error}
        </div>
      )}

      {/* Competition select — limité à la saison du calendrier */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Compétition · saison {calSeason}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 12, height: 12, background: autoColor, flexShrink: 0 }} />
          <select
            value={compId}
            onChange={(e) => setCompId(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            <option value="">— Choisir une compétition —</option>
            {availableComps.map((c) => {
              const lockedIn = compToCalendarName.get(c.id);
              return (
                <option key={c.id} value={c.id} disabled={!!lockedIn}>
                  {c.name} ({c.category} · {c.mode === 'GAZON' ? 'Gazon' : 'Salle'})
                  {lockedIn ? ` — déjà dans « ${lockedIn} »` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Aide : projection du nombre de journées nécessaires. */}
      <MatchdaysHint selectedComp={selectedComp} />

      {/* Enchaîner après la dernière journée déjà planifiée */}
      <div style={{ marginBottom: 14 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: canChain ? 'pointer' : 'not-allowed', opacity: canChain ? 1 : 0.55,
        }}>
          <input
            type="checkbox"
            checked={chain}
            disabled={!canChain}
            onChange={(e) => setChain(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: LRH.navy }}
          />
          <span style={{ ...body, fontSize: 13, color: LRH.ink }}>
            Enchaîner après la dernière journée planifiée
          </span>
        </label>
        <div style={{ ...body, fontSize: 11, color: LRH.mute, marginTop: 4, marginLeft: 28 }}>
          {canChain
            ? `La date de début se cale sur le premier ${dayOfWeek === 'SUNDAY' ? 'dimanche' : 'samedi'} après le ${formatShortDate(lastScheduledDateISO!)}.`
            : 'Disponible dès qu’une première compétition est planifiée dans ce calendrier.'}
        </div>
      </div>

      {/* Day + Recurrence + Matches/day */}
      <div className="dash-grid-form" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Jour</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value as 'SATURDAY' | 'SUNDAY')}
            style={inputStyle}
          >
            <option value="SATURDAY">Samedi</option>
            <option value="SUNDAY">Dimanche</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Récurrence</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(Number(e.target.value))}
            style={inputStyle}
          >
            <option value={1}>Chaque semaine</option>
            <option value={2}>Toutes les 2 semaines</option>
            <option value={3}>Toutes les 3 semaines</option>
            <option value={4}>Toutes les 4 semaines</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Matchs / journée</label>
          <input
            type="number"
            min={1}
            max={10}
            value={slotsPerDay}
            onChange={(e) => setSlotsPerDay(Math.max(1, Number(e.target.value)))}
            style={{ ...inputStyle, textAlign: 'center' }}
          />
        </div>
      </div>

      {/* Début + Nombre de journées → la date de fin est calculée */}
      <div className="dash-grid-form" style={{ marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Début</label>
          <input
            type="date"
            value={effectiveStart}
            disabled={chain}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ ...inputStyle, opacity: chain ? 0.6 : 1, cursor: chain ? 'not-allowed' : 'auto' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Nombre de journées</label>
          <input
            type="number"
            min={1}
            max={60}
            value={matchdayCount}
            onChange={(e) => { setCountTouched(true); setMatchdayCount(Math.max(1, Number(e.target.value))); }}
            style={{ ...inputStyle, textAlign: 'center' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Fin (calculée)</label>
          <div style={{
            ...inputStyle, display: 'flex', alignItems: 'center',
            background: LRH.paper, color: LRH.ink2,
          }}>
            {computedEndISO ? formatShortDate(computedEndISO) : '—'}
          </div>
        </div>
      </div>

      {/* Preview */}
      {previewDates.length > 0 && (
        <div style={{
          padding: 14, background: 'rgba(0,34,68,0.03)',
          border: `1px solid ${LRH.hair}`, marginBottom: 16,
        }}>
          <div style={{ ...mono, fontSize: 10, color: LRH.navy, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Aperçu : {previewDates.length} journée{previewDates.length > 1 ? 's' : ''}
          </div>
          {exceedsWindow && (
            <div style={{ ...body, fontSize: 11, color: LRH.red, marginBottom: 8 }}>
              ⚠ La {matchdayCount}<sup>e</sup> journée tomberait après la fin du calendrier ({formatShortDate(calEndDate)}).
              {' '}Seules {previewDates.length} journée{previewDates.length > 1 ? 's' : ''} seront générées — élargissez la période du calendrier ou réduisez le nombre de journées.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {previewDates.map((d, i) => (
              <span key={i} style={{
                ...mono, fontSize: 10, padding: '3px 8px',
                background: '#fff', border: `1px solid ${LRH.hair}`, color: LRH.ink2,
                borderLeft: `3px solid ${autoColor}`,
              }}>
                J{i + 1} — {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {availableComps.length === 0 && (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 12 }}>
          {seasonHasComps
            ? `Toutes les compétitions de la saison ${calSeason} sont déjà ajoutées.`
            : `Aucune compétition pour la saison ${calSeason}. Créez-la d'abord dans Compétitions.`}
        </div>
      )}

      {availableComps.length > 0 && availableComps.every((c) => compToCalendarName.has(c.id)) && (
        <div style={{ ...body, fontSize: 12, color: LRH.mute, marginBottom: 12 }}>
          Les compétitions restantes de la saison {calSeason} sont déjà planifiées dans d&apos;autres calendriers. Retirez-les d&apos;abord pour les rattacher ici.
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!compId}
          style={{
            ...btnPrimary, background: '#059669',
            opacity: compId ? 1 : 0.5, cursor: compId ? 'pointer' : 'not-allowed',
          }}
        >
          Ajouter
        </button>
        <button type="button" onClick={onCancel} style={btnOutline(LRH.mute)}>
          Fermer
        </button>
      </div>
    </div>
  );
}
