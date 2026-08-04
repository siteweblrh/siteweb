'use client';

import React from 'react';
import { LRH, body, display, mono } from '@/components/lrh/tokens';
import { SeasonStatusBadge, SEASON_STATUS, type SeasonStatus } from './SeasonStatusBadge';
import { btnPrimary, btnGhost, btnDanger, btnDisabled, ACTION_GAP } from './ui';
import type { SeasonRow } from '@/lib/actions/season';

const fmt = (d: Date | string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Une saison et ses actions. Purement présentationnel : aucun appel serveur,
 * aucun state — tout remonte au parent. C'est ce qui permet de tester et de
 * relire cette carte sans dérouler la logique de l'écran.
 */
export function SeasonCard({
  season,
  busy,
  onOpen,
  onClose,
  onDelete,
}: {
  season: SeasonRow;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const status = season.status as SeasonStatus;
  const meta = SEASON_STATUS[status];
  const attached =
    season._count.competitions + season._count.draftCalendars + season._count.engagements;
  const isCurrent = status === 'EN_COURS';
  /** Suppression refusée : saison en cours, ou éléments encore rattachés. */
  const blocked = isCurrent || attached > 0;

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hair,
        // Accent latéral repris de la charte : l'état se lit avant le texte.
        borderLeft: `4px solid ${isCurrent ? '#16a34a' : status === 'PREPARATION' ? LRH.navy : LRH.hairStrong}`,
        borderRadius: 4,
        padding: 'clamp(14px, 2.5vw, 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <h3
          style={{
            ...display,
            fontWeight: 800,
            fontSize: 'clamp(20px, 3vw, 26px)',
            color: LRH.navy,
            margin: 0,
            letterSpacing: '-0.02em',
            flexGrow: 1,
          }}
        >
          {season.label.replace(/-/g, '–')}
        </h3>
        <SeasonStatusBadge status={status} />
      </div>

      <p style={{ ...body, fontSize: 12.5, color: LRH.mute, margin: 0 }}>{meta.help}</p>

      <dl
        style={{
          ...mono,
          fontSize: 11,
          color: LRH.ink2,
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8,
        }}
      >
        <div>
          <dt style={{ color: LRH.mute, letterSpacing: '0.1em' }}>PÉRIODE</dt>
          <dd style={{ margin: '2px 0 0' }}>
            {fmt(season.startsAt)} → {fmt(season.endsAt)}
          </dd>
        </div>
        <div>
          <dt style={{ color: LRH.mute, letterSpacing: '0.1em' }}>COMPÉTITIONS</dt>
          <dd style={{ margin: '2px 0 0' }}>
            {season._count.competitions.toString().padStart(2, '0')}
          </dd>
        </div>
        <div>
          <dt style={{ color: LRH.mute, letterSpacing: '0.1em' }}>ENGAGEMENTS</dt>
          <dd style={{ margin: '2px 0 0' }}>
            {season._count.engagements.toString().padStart(2, '0')}
          </dd>
        </div>
      </dl>

      {/* gap 24px : l'espacement compte autant que la taille pour éviter les
          appuis accidentels entre une action bénigne et une destructive. */}
      <div style={{ display: 'flex', gap: ACTION_GAP, flexWrap: 'wrap', marginTop: 4 }}>
        <button
          type="button"
          onClick={isCurrent ? onClose : onOpen}
          disabled={busy}
          style={{ ...(isCurrent ? btnGhost : btnPrimary), opacity: busy ? 0.5 : 1 }}
        >
          {isCurrent ? 'Clôturer' : 'Ouvrir cette saison'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || blocked}
          // Le titre explique le refus au lieu de laisser un bouton mort sans
          // raison. Le serveur refuse de toute façon : ceci n'est qu'un confort.
          title={
            isCurrent
              ? 'Impossible : c’est la saison en cours.'
              : attached > 0
                ? `Impossible : ${attached} élément(s) rattaché(s).`
                : undefined
          }
          style={{ ...(blocked ? btnDisabled : btnDanger), opacity: busy ? 0.5 : 1 }}
        >
          Supprimer
        </button>
      </div>
    </article>
  );
}
