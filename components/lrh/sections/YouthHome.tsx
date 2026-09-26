'use client';

import React from 'react';
import { LRH, mono, display, body, categoryAccent } from '../tokens';
import { SectionHeading, MobileSectionLabel, MobileSectionTitle } from './SectionHeading';
import { memberFullName } from '@/lib/utils/member-name';
import type { YouthHomeBlock } from '@/lib/queries/scorers';

/**
 * Bloc « Championnat Jeunes » de la page d'accueil : une carte par catégorie
 * ayant joué, avec le haut de son classement et son meilleur buteur.
 *
 * Il est DISTINCT du strip du hero et de la grille Bento, et c'est le point :
 * ces deux-là restent séniors (cf. `seasonScope`, lib/queries/competition.ts).
 * Les jeunes ont leur propre bloc, explicitement titré, au lieu de remplacer
 * silencieusement le « Leader » et le « Top buteur » de la ligue — ce que la
 * saisie du rassemblement du 26/09/2026 avait provoqué.
 *
 * Les deux variantes vivent dans le même fichier : un module `'use client'`
 * n'est pas tree-shaké par export, elles sont livrées ensemble de toute façon
 * (cf. CLAUDE.md). Le composant se masque tout seul quand aucune catégorie n'a
 * joué dans la discipline affichée, donc la home d'une discipline sans
 * résultats jeunes est strictement inchangée.
 */

function CategoryCard({ block, mobileVariant }: { block: YouthHomeBlock; mobileVariant: boolean }) {
  const accent = categoryAccent(block.category);
  const leaderPoints = block.standings[0]?.points;

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid ' + LRH.hairStrong,
        borderLeft: `4px solid ${accent}`,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <header
        style={{
          padding: mobileVariant ? '12px 14px 10px' : '16px 18px 12px',
          borderBottom: '1px solid ' + LRH.hair,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            ...mono,
            fontSize: 9.5,
            fontWeight: 800,
            padding: '4px 8px',
            background: accent,
            color: '#fff',
            letterSpacing: '0.16em',
          }}
        >
          {block.category}
        </span>
        <h3
          style={{
            ...display,
            margin: 0,
            fontSize: mobileVariant ? 14 : 15,
            fontWeight: 800,
            color: LRH.navy,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            flex: '1 1 140px',
            minWidth: 0,
            overflowWrap: 'break-word',
          }}
        >
          {block.name}
        </h3>
      </header>

      {/* Classement — rangs, club, points. Volontairement sans la colonne
          « forme » : elle demande tous les matchs de la discipline, un coût
          que la home n'a pas à payer pour quatre lignes. */}
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {block.standings.map((row, i) => {
          const isLeader = row.points === leaderPoints;
          return (
            <li
              key={row.club.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: mobileVariant ? '8px 14px' : '8px 18px',
                borderTop: i === 0 ? 'none' : '1px solid ' + LRH.hair,
                background: isLeader ? 'rgba(243,188,28,0.07)' : undefined,
                boxShadow: isLeader ? `inset 3px 0 0 ${LRH.gold}` : undefined,
                minHeight: 38,
              }}
            >
              <span
                style={{
                  ...display,
                  fontSize: 13,
                  fontWeight: 800,
                  color: isLeader ? LRH.navy : LRH.mute,
                  width: 18,
                  flex: '0 0 18px',
                }}
              >
                {String(row.rank).padStart(2, '0')}
              </span>
              <span
                style={{
                  ...body,
                  fontSize: mobileVariant ? 12.5 : 13,
                  fontWeight: 600,
                  color: LRH.ink,
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflowWrap: 'break-word',
                }}
              >
                {row.club.shortCode ?? row.club.name}
              </span>
              <span
                style={{
                  ...mono,
                  fontSize: 10,
                  color: LRH.mute,
                  flex: '0 0 auto',
                  letterSpacing: '0.06em',
                }}
              >
                {row.goalsFor}/{row.goalsAgainst}
              </span>
              <span
                style={{
                  ...display,
                  fontSize: 13,
                  fontWeight: 800,
                  padding: '3px 9px',
                  minWidth: 32,
                  textAlign: 'center',
                  flex: '0 0 auto',
                  background: isLeader ? LRH.gold : LRH.navy,
                  color: isLeader ? LRH.navy : '#fff',
                  letterSpacing: '-0.02em',
                }}
              >
                {row.points}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Meilleur buteur de la catégorie */}
      {block.topScorer && (
        <div
          style={{
            marginTop: 'auto',
            padding: mobileVariant ? '10px 14px' : '12px 18px',
            borderTop: '1px dashed ' + LRH.hairStrong,
            background: LRH.paperWarm,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              ...mono,
              fontSize: 9,
              fontWeight: 800,
              color: LRH.red,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              flex: '0 0 auto',
            }}
          >
            ◎ Buteur
          </span>
          <span
            style={{
              ...body,
              fontSize: 13,
              fontWeight: 700,
              color: LRH.ink,
              flex: '1 1 auto',
              minWidth: 0,
              overflowWrap: 'break-word',
            }}
          >
            {memberFullName(block.topScorer)}
            <span style={{ ...mono, fontSize: 9.5, color: LRH.mute, marginLeft: 6 }}>
              {block.topScorer.clubLabel}
            </span>
          </span>
          <span
            style={{
              ...display,
              fontSize: 13,
              fontWeight: 800,
              padding: '3px 9px',
              background: LRH.gold,
              color: LRH.navy,
              flex: '0 0 auto',
            }}
          >
            {block.topScorer.goals}
          </span>
        </div>
      )}
    </article>
  );
}

function Grid({ blocks, mobileVariant }: { blocks: YouthHomeBlock[]; mobileVariant: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: mobileVariant ? 14 : 20,
        gridTemplateColumns: mobileVariant
          ? '1fr'
          : 'repeat(auto-fit, minmax(300px, 1fr))',
      }}
    >
      {blocks.map((b) => (
        <CategoryCard key={b.id} block={b} mobileVariant={mobileVariant} />
      ))}
    </div>
  );
}

export function YouthHomeDesktop({ blocks }: { blocks: YouthHomeBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <section style={{ padding: '72px 64px', background: LRH.paper }}>
      <SectionHeading
        kicker="03 · Championnat Jeunes"
        title={'Les catégories de<br/>formation, en direct'}
        action="Tous les classements jeunes"
        actionHref="/jeunes"
      />
      <div style={{ marginTop: 32 }}>
        <Grid blocks={blocks} mobileVariant={false} />
      </div>
    </section>
  );
}

export function YouthHomeMobile({ blocks }: { blocks: YouthHomeBlock[] }) {
  if (blocks.length === 0) return null;
  return (
    <section style={{ padding: '28px 16px', background: LRH.paper }}>
      <MobileSectionLabel kicker="03 · Jeunes" action="Tout voir" actionHref="/jeunes" />
      <MobileSectionTitle>Championnat Jeunes</MobileSectionTitle>
      <div style={{ marginTop: 16 }}>
        <Grid blocks={blocks} mobileVariant />
      </div>
    </section>
  );
}
