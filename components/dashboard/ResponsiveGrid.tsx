'use client';

import React from 'react';

/**
 * Drop-in replacement pour `<div style={{ display: 'grid', gridTemplateColumns: ... }}>`
 * qui collapse automatiquement en 1 colonne sous un breakpoint donné.
 *
 * Pattern le plus courant dans le dashboard admin LRH :
 *
 *   Avant (cassait en mobile) :
 *     <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
 *       <input /><input />
 *     </div>
 *
 *   Après :
 *     <ResponsiveGrid cols="2fr 1fr" gap={14}>
 *       <input /><input />
 *     </ResponsiveGrid>
 *
 * Par défaut, collapse à 1 colonne sous 720px. Override via `mobileBreak`.
 * Pour conserver le grid template en mobile (cas rare), passer
 * `keepOnMobile`.
 *
 * Note technique : styled-jsx ne supporte pas le HMR sur les media queries
 * basées sur une prop (qui changerait la valeur entre les renders). On
 * utilise donc un ID stable basé sur les props (hash simple) pour générer
 * une classe unique par configuration.
 */
export function ResponsiveGrid({
  cols,
  gap = 14,
  mobileBreak = 720,
  mobileCols = '1fr',
  align = 'stretch',
  marginBottom,
  children,
  style,
}: {
  /** Grid template columns desktop. Ex. "2fr 1fr" ou "1fr 1fr 1fr". */
  cols: string;
  /** Gap en px. Default 14. */
  gap?: number | string;
  /** Breakpoint sous lequel on collapse. Default 720px. */
  mobileBreak?: number;
  /** Template mobile. Default "1fr" (stack). Mettre par ex "1fr 1fr" pour 2 col mobile. */
  mobileCols?: string;
  /** align-items. Default stretch. */
  align?: React.CSSProperties['alignItems'];
  marginBottom?: number | string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  // ID stable basé sur les valeurs structurelles (pas sur les enfants).
  const id = React.useId().replace(/:/g, '');
  return (
    <div
      className={`lrh-rg-${id}`}
      style={{ display: 'grid', alignItems: align, marginBottom, ...style }}
    >
      {children}
      <style jsx>{`
        .lrh-rg-${id} {
          grid-template-columns: ${cols};
          gap: ${typeof gap === 'number' ? `${gap}px` : gap};
        }
        @media (max-width: ${mobileBreak}px) {
          .lrh-rg-${id} {
            grid-template-columns: ${mobileCols};
          }
        }
      `}</style>
    </div>
  );
}
