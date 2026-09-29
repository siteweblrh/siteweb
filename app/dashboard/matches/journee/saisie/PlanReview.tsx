'use client';

import React from 'react';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { formatMatchDay } from '@/lib/utils/match-format';
import { formatReunionTime } from '@/lib/utils/datetime-reunion';
import type {
  MatchdayPlan,
  PersonDecision,
  PersonQuestion,
  PlanAlert,
  PlannedEvent,
  PlannedMatch,
} from '@/lib/matchsheet/types';

const GREEN = '#1d6b3f';

/**
 * Rendu du plan : ce que l'enregistrement ferait, et ce qui l'en empêche.
 * Accent vertical rouge = bloquant, or = avertissement, vert = prêt
 * (charte : pas d'icône décorative, l'état se lit à la couleur ET au texte).
 */
export function PlanReview({
  plan, decisions, confirmed, busy, onDecide, onOverwrite,
}: {
  plan: MatchdayPlan;
  decisions: Record<string, PersonDecision>;
  confirmed: string[];
  busy: boolean;
  onDecide: (key: string, decision: PersonDecision | null) => void;
  onOverwrite: (matchId: string, on: boolean) => void;
}) {
  return (
    <section aria-label="Aperçu de l'enregistrement" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ ...display, fontWeight: 800, fontSize: 20, color: LRH.navy, margin: 0, letterSpacing: '-0.02em' }}>
        {plan.competitionLabel} · J{String(plan.matchday).padStart(2, '0')}
      </h2>

      {plan.alerts.length > 0 && <Alerts alerts={plan.alerts} />}

      {plan.questions.length > 0 && (
        <div>
          <h3 style={sectionTitle}>Joueurs à identifier</h3>
          <p style={{ ...body, fontSize: 13, color: LRH.ink2, margin: '0 0 14px', maxWidth: 760 }}>
            La base ne permet pas de les reconnaître à coup sûr. Un choix vaut pour toutes
            leurs apparitions de la journée. « Nom libre » garde le nom de la feuille sur la
            fiche du match, mais le joueur n&apos;entre pas au classement des buteurs.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plan.questions.map((q) => (
              <Question key={q.key} q={q} current={decisions[q.key] ?? null} busy={busy} onDecide={onDecide} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 style={sectionTitle}>Rencontres</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plan.matches.map((m) => (
            <MatchBlock
              key={m.line}
              m={m}
              confirmed={m.matchId ? confirmed.includes(m.matchId) : false}
              busy={busy}
              onOverwrite={onOverwrite}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const sectionTitle: React.CSSProperties = {
  ...mono, fontSize: 11, fontWeight: 800, color: LRH.red,
  letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 10px',
};

function Alerts({ alerts }: { alerts: PlanAlert[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {alerts.map((a, i) => (
        <li key={i} style={{
          ...body, fontSize: 13, lineHeight: 1.5, padding: '8px 12px',
          color: a.level === 'blocking' ? LRH.red : LRH.ink,
          background: a.level === 'blocking' ? 'rgba(168,32,47,0.06)' : 'rgba(243,188,28,0.12)',
          borderLeft: `3px solid ${a.level === 'blocking' ? LRH.red : LRH.gold}`,
        }}>
          <strong style={{ ...mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 8 }}>
            {a.level === 'blocking' ? 'Bloquant' : 'À vérifier'}
            {a.line ? ` · l.${a.line}` : ''}
          </strong>
          {a.message}
        </li>
      ))}
    </ul>
  );
}

const REASON: Record<PersonQuestion['reason'], string> = {
  absent: 'absent de la base',
  partial: 'nom approchant en base',
  homonyms: 'plusieurs joueurs portent ce nom',
};

function Question({
  q, current, busy, onDecide,
}: {
  q: PersonQuestion;
  current: PersonDecision | null;
  busy: boolean;
  onDecide: (key: string, decision: PersonDecision | null) => void;
}) {
  const isOn = (d: PersonDecision) =>
    current?.type === d.type &&
    (d.type !== 'member' || (current.type === 'member' && current.memberId === d.memberId)) &&
    (d.type !== 'create' || (current.type === 'create' && current.clubId === d.clubId));

  const choices: { label: string; decision: PersonDecision }[] = [
    ...q.candidates.map((c) => ({ label: `C'est ${c.label}`, decision: { type: 'member', memberId: c.id } as PersonDecision })),
    ...q.createIn.map((c) => ({ label: `Créer chez ${c.label}`, decision: { type: 'create', clubId: c.clubId } as PersonDecision })),
    { label: 'Nom libre', decision: { type: 'free' } },
  ];

  return (
    <div style={{
      background: '#fff', border: '1px solid ' + LRH.hair,
      borderLeft: `4px solid ${current ? GREEN : LRH.red}`, padding: '14px 16px',
    }}>
      <div style={{ ...body, fontSize: 14.5, fontWeight: 700, color: LRH.ink }}>
        {q.name}{q.jersey != null ? ` #${q.jersey}` : ''}
        <span style={{ ...body, fontWeight: 400, fontSize: 13, color: LRH.ink2 }}>
          {' '}— {q.teamClubLabel}, {REASON[q.reason]}
        </span>
      </div>
      <div role="group" aria-label={`Identifier ${q.name}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {choices.map((c) => {
          const on = isOn(c.decision);
          return (
            <button
              key={c.label}
              type="button"
              aria-pressed={on}
              disabled={busy}
              onClick={() => onDecide(q.key, on ? null : c.decision)}
              style={{
                ...body, fontSize: 13, fontWeight: 600, minHeight: 48, padding: '0 16px',
                borderRadius: 4, cursor: busy ? 'wait' : 'pointer',
                background: on ? LRH.navy : '#fff', color: on ? '#fff' : LRH.navy,
                border: '1px solid ' + (on ? LRH.navy : LRH.hairStrong),
              }}
            >{c.label}</button>
          );
        })}
      </div>
    </div>
  );
}

function MatchBlock({
  m, confirmed, busy, onOverwrite,
}: {
  m: PlannedMatch;
  confirmed: boolean;
  busy: boolean;
  onOverwrite: (matchId: string, on: boolean) => void;
}) {
  const hasBlocking = m.alerts.some((a) => a.level === 'blocking');
  const hasWarning = m.alerts.some((a) => a.level === 'warning');
  const accent = hasBlocking ? LRH.red : hasWarning ? LRH.gold : GREEN;
  const side = (s: 'home' | 'away') => m.events.filter((e) => e.side === s);

  return (
    <article style={{ background: '#fff', border: '1px solid ' + LRH.hair, borderLeft: `4px solid ${accent}` }}>
      <header style={{
        padding: '14px 16px', borderBottom: '1px solid ' + LRH.hair,
        display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'baseline',
      }}>
        <span style={{ ...display, fontWeight: 800, fontSize: 17, color: LRH.navy }}>{m.title}</span>
        {m.kickoffLabel && (
          <span style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {formatMatchDay(new Date(m.kickoffLabel))} · {formatReunionTime(m.kickoffLabel)}
          </span>
        )}
        <span style={{ ...mono, fontSize: 10.5, color: LRH.mute, marginLeft: 'auto' }}>l.{m.line}</span>
      </header>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {m.existing && m.matchId && (
          <label style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer',
            ...body, fontSize: 13, color: LRH.ink, background: LRH.paperWarm, padding: '10px 12px',
          }}>
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => onOverwrite(m.matchId!, e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 1, accentColor: LRH.navy, flex: '0 0 auto' }}
            />
            <span>
              <strong>Remplacer la saisie existante</strong> — actuellement {m.existing.score ?? 'sans score'},{' '}
              {m.existing.goals} but{m.existing.goals > 1 ? 's' : ''}, {m.existing.cards} carton{m.existing.cards > 1 ? 's' : ''},{' '}
              {m.existing.injuries} blessure{m.existing.injuries > 1 ? 's' : ''}. Tout sera effacé puis réécrit depuis le texte.
            </span>
          </label>
        )}

        {m.alerts.length > 0 && <Alerts alerts={m.alerts} />}

        {m.events.length > 0 && (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
            <EventList title="Domicile" events={side('home')} />
            <EventList title="Visiteur" events={side('away')} />
          </div>
        )}
      </div>
    </article>
  );
}

const KIND: Record<PlannedEvent['kind'], string> = { goal: 'But', card: 'Carton', injury: 'Blessure' };
const AS: Record<PlannedEvent['as'], { label: string; color: string } | null> = {
  member: null,
  create: { label: 'nouveau joueur', color: GREEN },
  free: { label: 'nom libre', color: LRH.mute },
  unresolved: { label: 'à identifier', color: LRH.red },
};

function EventList({ title, events }: { title: string; events: PlannedEvent[] }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
        {title}
      </div>
      {events.length === 0 ? (
        <div style={{ ...body, fontSize: 12.5, color: LRH.mute, fontStyle: 'italic' }}>Rien de saisi.</div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {events.map((e, i) => {
            const badge = AS[e.as];
            return (
              <li key={i} style={{
                ...body, fontSize: 13, color: LRH.ink, padding: '6px 0',
                borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
                display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline',
              }}>
                <span style={{ ...mono, fontSize: 9.5, fontWeight: 800, color: LRH.navy, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 58 }}>
                  {KIND[e.kind]}
                </span>
                <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{e.who}</span>
                <span style={{ color: LRH.ink2 }}>{e.detail}</span>
                {badge && (
                  <span style={{ ...mono, fontSize: 9, fontWeight: 700, color: badge.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {badge.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
