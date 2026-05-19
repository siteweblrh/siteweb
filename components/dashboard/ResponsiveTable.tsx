'use client';

import React from 'react';
import { LRH, mono } from '@/components/lrh/tokens';

/**
 * Wrapper « table responsive » pour les vues admin :
 *
 *   - sandbox `overflow-x: auto` (la table peut être plus large que son
 *     conteneur sans débordement du document)
 *   - ombre d'indication latérale qui aide l'utilisateur à comprendre
 *     qu'on peut faire glisser horizontalement
 *   - scrollbar fine pour ne pas casser l'esthétique
 *
 * Utilisation :
 *
 *   <ResponsiveTableScroll>
 *     <table>…</table>
 *   </ResponsiveTableScroll>
 *
 * Pour un layout 100 % mobile (cards empilées au lieu de table), créer un
 * second rendu conditionnel dans la page. Ce composant garde le tableau
 * intact.
 */
export function ResponsiveTableScroll({
  children,
  hint = true,
}: {
  children: React.ReactNode;
  /** Petit indice mono UPPERCASE « ← Glisser pour voir → » sur mobile. */
  hint?: boolean;
}) {
  return (
    <div style={{ position: 'relative' }}>
      {hint && (
        <div
          style={{
            display: 'none',
            ...mono,
            fontSize: 9,
            color: LRH.mute,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            padding: '0 4px 6px',
          }}
          className="lrh-table-hint"
        >
          ← Glisser pour voir →
        </div>
      )}
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          // Indique visuellement le scroll possible avec un fade des bords.
          background:
            'linear-gradient(90deg, #fff 30%, rgba(255,255,255,0)) 0 0, ' +
            'linear-gradient(-90deg, #fff 30%, rgba(255,255,255,0)) 100% 0, ' +
            'radial-gradient(farthest-side at 0 50%, rgba(0,34,68,0.10), rgba(0,0,0,0)) 0 0, ' +
            'radial-gradient(farthest-side at 100% 50%, rgba(0,34,68,0.10), rgba(0,0,0,0)) 100% 0',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '40px 100%, 40px 100%, 14px 100%, 14px 100%',
          backgroundAttachment: 'local, local, scroll, scroll',
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @media (max-width: 720px) {
          .lrh-table-hint {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
