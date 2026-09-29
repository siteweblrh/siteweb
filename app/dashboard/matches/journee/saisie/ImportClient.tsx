'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { LRH, body, mono } from '@/components/lrh/tokens';
import { errorMessage } from '@/lib/utils/error-message';
import { formatMatchDay } from '@/lib/utils/match-format';
import { planMatchdayImport, applyMatchdayImport } from '@/lib/actions/matchsheet';
import type { MatchdayPlan, PersonDecision } from '@/lib/matchsheet/types';
import { PlanReview } from './PlanReview';
import { FormatHelp } from './FormatHelp';

export type CompetitionOption = {
  id: string;
  label: string;
  mode: 'GAZON' | 'SALLE';
  matchdays: { matchday: number; date: string; total: number; finished: number }[];
};

const fieldStyle: React.CSSProperties = {
  ...body, fontSize: 14, padding: '10px 12px', minHeight: 44,
  width: '100%', boxSizing: 'border-box',
  border: '1px solid ' + LRH.hairStrong, borderRadius: 4,
  background: '#fff', color: LRH.ink,
};
const labelStyle: React.CSSProperties = {
  ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
  letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
};
const btn = (primary: boolean, disabled: boolean): React.CSSProperties => ({
  ...body, fontSize: 12.5, fontWeight: 700, minHeight: 48, padding: '0 20px',
  borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  background: primary ? LRH.navy : '#fff', color: primary ? '#fff' : LRH.navy,
  border: '1px solid ' + LRH.navy,
});

/** Première journée pas encore entièrement terminée, sinon la première. */
function defaultMatchday(c: CompetitionOption | undefined): number | null {
  if (!c || c.matchdays.length === 0) return null;
  return (c.matchdays.find((d) => d.finished < d.total) ?? c.matchdays[0]).matchday;
}

/**
 * Saisie rapide de journée, côté navigateur : état du formulaire et
 * aller-retour avec les deux actions serveur. Le rendu du plan vit dans
 * `PlanReview`, l'aide de format dans `FormatHelp`.
 *
 * Le plan affiché n'est JAMAIS celui qui est écrit : « Enregistrer » renvoie
 * le texte et les choix, et le serveur recalcule tout (§9 du cadrage).
 */
export function ImportClient({
  competitions,
  initialCompetitionId,
  initialMatchday,
}: {
  competitions: CompetitionOption[];
  initialCompetitionId: string;
  initialMatchday: number | null;
}) {
  const [competitionId, setCompetitionId] = useState(initialCompetitionId);
  const competition = competitions.find((c) => c.id === competitionId);
  const [matchday, setMatchday] = useState<number | null>(
    initialMatchday != null && competition?.matchdays.some((d) => d.matchday === initialMatchday)
      ? initialMatchday
      : defaultMatchday(competition),
  );
  const [text, setText] = useState('');
  const [decisions, setDecisions] = useState<Record<string, PersonDecision>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [plan, setPlan] = useState<MatchdayPlan | null>(null);
  // Le texte a changé depuis la dernière analyse : le plan affiché est périmé.
  const [stale, setStale] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const day = useMemo(
    () => competition?.matchdays.find((d) => d.matchday === matchday) ?? null,
    [competition, matchday],
  );

  const analyse = (next?: { decisions?: Record<string, PersonDecision>; confirmed?: string[] }) => {
    if (!competitionId || matchday == null) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await planMatchdayImport({
          competitionId, matchday, text,
          decisions: next?.decisions ?? decisions,
          confirmedOverwrite: next?.confirmed ?? confirmed,
        });
        if (!res.ok) {
          setPlan(null);
          setMessage({ tone: 'error', text: res.message });
          return;
        }
        setPlan(res.plan);
        setStale(false);
      } catch (e) {
        setMessage({ tone: 'error', text: errorMessage(e, "Erreur pendant l'analyse") });
      }
    });
  };

  // Un choix (identification, confirmation) relance l'analyse : le plan
  // affiché reflète toujours exactement ce qui serait écrit.
  const decide = (key: string, decision: PersonDecision | null) => {
    const next = { ...decisions };
    if (decision) next[key] = decision;
    else delete next[key];
    setDecisions(next);
    analyse({ decisions: next });
  };
  const toggleOverwrite = (matchId: string, on: boolean) => {
    const next = on ? [...confirmed, matchId] : confirmed.filter((id) => id !== matchId);
    setConfirmed(next);
    analyse({ confirmed: next });
  };

  const save = () => {
    if (!plan?.ready || stale || matchday == null) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await applyMatchdayImport({
          competitionId, matchday, text, decisions, confirmedOverwrite: confirmed,
        });
        if (!res.ok) {
          setMessage({ tone: 'error', text: res.message });
          if (res.plan) setPlan(res.plan);
          return;
        }
        const s = res.summary;
        setMessage({
          tone: 'ok',
          text: `Journée enregistrée : ${s.matches} match${s.matches > 1 ? 's' : ''}, ${s.goals} but${s.goals > 1 ? 's' : ''}, ${s.cards} carton${s.cards > 1 ? 's' : ''}, ${s.injuries} blessure${s.injuries > 1 ? 's' : ''}${s.created ? `, ${s.created} joueur${s.created > 1 ? 's' : ''} créé${s.created > 1 ? 's' : ''}` : ''}. Classement recalculé, pages publiques rafraîchies.`,
        });
        setPlan(null);
        setText('');
        setDecisions({});
        setConfirmed([]);
      } catch (e) {
        setMessage({ tone: 'error', text: errorMessage(e, "Erreur pendant l'enregistrement — rien n'a été écrit") });
      }
    });
  };

  if (competitions.length === 0) {
    return (
      <p style={{ ...body, fontSize: 14, color: LRH.mute }}>
        Aucune compétition n&apos;a de journée au calendrier. Commencez par{' '}
        <Link href="/dashboard/matches/journee/new" style={{ color: LRH.navy }}>créer une journée</Link>.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Compétition + journée */}
      <div style={{
        display: 'grid', gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
      }}>
        <div>
          <label htmlFor="ms-competition" style={labelStyle}>Compétition</label>
          <select
            id="ms-competition"
            style={{ ...fieldStyle, cursor: 'pointer' }}
            value={competitionId}
            onChange={(e) => {
              const next = competitions.find((c) => c.id === e.target.value);
              setCompetitionId(e.target.value);
              setMatchday(defaultMatchday(next));
              setPlan(null); setDecisions({}); setConfirmed([]);
            }}
          >
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ms-matchday" style={labelStyle}>Journée</label>
          <select
            id="ms-matchday"
            style={{ ...fieldStyle, cursor: 'pointer' }}
            value={matchday ?? ''}
            onChange={(e) => {
              setMatchday(Number(e.target.value));
              setPlan(null); setDecisions({}); setConfirmed([]);
            }}
          >
            {competition?.matchdays.map((d) => (
              <option key={d.matchday} value={d.matchday}>
                J{String(d.matchday).padStart(2, '0')} · {formatMatchDay(new Date(d.date))} · {d.finished}/{d.total} terminé{d.finished > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {day && day.finished > 0 && (
        <p style={{ ...body, fontSize: 12.5, color: LRH.ink2, margin: 0 }}>
          {day.finished} rencontre{day.finished > 1 ? 's' : ''} de cette journée {day.finished > 1 ? 'sont' : 'est'} déjà
          saisie{day.finished > 1 ? 's' : ''} : l&apos;écran vous demandera de confirmer avant de les remplacer.
        </p>
      )}

      <div>
        <label htmlFor="ms-text" style={labelStyle}>Feuille de match</label>
        <textarea
          id="ms-text"
          value={text}
          onChange={(e) => { setText(e.target.value); if (plan) setStale(true); }}
          rows={14}
          spellCheck={false}
          placeholder={'HCP 10 - 4 USPG\nButeurs HCP (10 buts) :\nMathieu Ledoux (#18) : 3 buts\n…'}
          aria-describedby="ms-help"
          style={{ ...fieldStyle, ...mono, fontSize: 13, lineHeight: 1.55, resize: 'vertical', minHeight: 220 }}
        />
        <FormatHelp id="ms-help" />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
        <button
          type="button"
          style={btn(false, pending || !text.trim() || matchday == null)}
          disabled={pending || !text.trim() || matchday == null}
          onClick={() => analyse()}
        >
          {pending ? 'Analyse…' : plan ? 'Réanalyser' : 'Analyser'}
        </button>
        <button
          type="button"
          style={btn(true, pending || !plan?.ready || stale)}
          disabled={pending || !plan?.ready || stale}
          onClick={save}
        >
          Enregistrer la journée
        </button>
        {plan && (
          <span role="status" style={{ ...body, fontSize: 13, fontWeight: 600, color: stale ? LRH.red : plan.ready ? '#1d6b3f' : LRH.red }}>
            {stale
              ? 'Texte modifié : réanalysez avant d’enregistrer.'
              : plan.ready ? 'Prêt à enregistrer.' : 'Des points bloquent l’enregistrement (voir ci-dessous).'}
          </span>
        )}
      </div>

      {message && (
        <div role={message.tone === 'error' ? 'alert' : 'status'} style={{
          ...body, fontSize: 13.5, padding: '12px 14px',
          color: message.tone === 'error' ? LRH.red : '#1d6b3f',
          background: message.tone === 'error' ? 'rgba(168,32,47,0.07)' : 'rgba(29,107,63,0.07)',
          borderLeft: `4px solid ${message.tone === 'error' ? LRH.red : '#1d6b3f'}`,
        }}>{message.text}</div>
      )}

      {plan && (
        <PlanReview
          plan={plan}
          decisions={decisions}
          confirmed={confirmed}
          busy={pending}
          onDecide={decide}
          onOverwrite={toggleOverwrite}
        />
      )}
    </div>
  );
}
