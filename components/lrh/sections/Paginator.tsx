'use client';

import React from 'react';
import Link from 'next/link';
import { LRH, mono, display } from '../tokens';
import { paginate } from '@/lib/utils/paginate';

/**
 * Pagination éditoriale LRH. Stateless — la page courante et le nombre total
 * sont passés en props ; chaque numéro est rendu en Link via hrefBuilder pour
 * préserver les autres query params (filtre catégorie, mode, etc.).
 *
 * Affichage :
 *   01 · PAGE 3 / 12
 *   ◂ Préc.   1 · 2 · [3] · 4 · 5 … 12   Suiv. ▸
 *
 * Si une seule page → ne rend rien (économie de bruit visuel).
 */
export function Paginator({
  currentPage,
  totalPages,
  totalItems,
  hrefBuilder,
  onPageChange,
  mobileVariant = false,
  /** Libellé de ce qu'on pagine — ex: "article", "match", "joueur" (singulier) */
  itemLabel,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  /** Construit l'URL d'une page (server-side pagination). Ignoré si onPageChange est défini. */
  hrefBuilder?: (page: number) => string;
  /** Callback client-side (préempte hrefBuilder). Pratique pour state local. */
  onPageChange?: (page: number) => void;
  mobileVariant?: boolean;
  itemLabel?: string;
}) {
  if (totalPages <= 1) return null;
  const builder = hrefBuilder ?? (() => '#');

  const pageNumbers = buildPageList(currentPage, totalPages);
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      style={{
        padding: mobileVariant ? '20px 16px 28px' : 'clamp(28px, 4vw, 40px) clamp(20px, 4.5vw, 64px) clamp(36px, 4vw, 56px)',
        display: 'flex',
        flexDirection: mobileVariant ? 'column' : 'row',
        alignItems: mobileVariant ? 'stretch' : 'center',
        gap: mobileVariant ? 16 : 20,
        borderTop: '1px dashed ' + LRH.hairStrong,
        background: LRH.paper,
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10.5,
          fontWeight: 700,
          color: LRH.mute,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: LRH.red, marginRight: 6 }}>
          {String(currentPage).padStart(2, '0')}
        </span>
        page {currentPage} / {totalPages}
        {itemLabel && (
          <span style={{ color: LRH.mute, marginLeft: 10, opacity: 0.7 }}>
            · {totalItems} {itemLabel}{totalItems > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: mobileVariant ? 4 : 6,
          justifyContent: mobileVariant ? 'center' : 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        {/* Prev */}
        <PaginatorButton
          disabled={isFirst}
          href={builder(prevPage)}
          onClick={onPageChange ? () => onPageChange(prevPage) : undefined}
          ariaLabel="Page précédente"
          mobileVariant={mobileVariant}
        >
          ◂ Préc.
        </PaginatorButton>

        {/* Numbers */}
        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              style={{
                ...mono,
                fontSize: 12,
                color: LRH.mute,
                padding: '0 4px',
              }}
            >
              …
            </span>
          ) : p === currentPage ? (
            <span
              key={p}
              aria-current="page"
              style={{
                ...display,
                fontWeight: 800,
                fontSize: mobileVariant ? 13 : 14,
                color: '#fff',
                background: LRH.navy,
                padding: mobileVariant ? '6px 10px' : '7px 12px',
                letterSpacing: '-0.01em',
                minWidth: mobileVariant ? 30 : 34,
                textAlign: 'center',
              }}
            >
              {p}
            </span>
          ) : onPageChange ? (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                ...display,
                fontWeight: 700,
                fontSize: mobileVariant ? 13 : 14,
                color: LRH.navy,
                background: '#fff',
                border: '1px solid ' + LRH.hairStrong,
                padding: mobileVariant ? '6px 10px' : '7px 12px',
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                minWidth: mobileVariant ? 30 : 34,
                textAlign: 'center',
                fontFamily: 'inherit',
              }}
            >
              {p}
            </button>
          ) : (
            <Link
              key={p}
              href={builder(p)}
              style={{
                ...display,
                fontWeight: 700,
                fontSize: mobileVariant ? 13 : 14,
                color: LRH.navy,
                background: '#fff',
                border: '1px solid ' + LRH.hairStrong,
                padding: mobileVariant ? '6px 10px' : '7px 12px',
                textDecoration: 'none',
                letterSpacing: '-0.01em',
                minWidth: mobileVariant ? 30 : 34,
                textAlign: 'center',
              }}
            >
              {p}
            </Link>
          ),
        )}

        {/* Next */}
        <PaginatorButton
          disabled={isLast}
          href={builder(nextPage)}
          onClick={onPageChange ? () => onPageChange(nextPage) : undefined}
          ariaLabel="Page suivante"
          mobileVariant={mobileVariant}
        >
          Suiv. ▸
        </PaginatorButton>
      </div>
    </nav>
  );
}

function PaginatorButton({
  href,
  onClick,
  disabled,
  children,
  ariaLabel,
  mobileVariant,
}: {
  href: string;
  onClick?: () => void;
  disabled: boolean;
  children: React.ReactNode;
  ariaLabel: string;
  mobileVariant: boolean;
}) {
  const style: React.CSSProperties = {
    ...mono,
    fontSize: mobileVariant ? 10.5 : 11,
    fontWeight: 700,
    padding: mobileVariant ? '6px 12px' : '7px 14px',
    background: disabled ? LRH.paperWarm : '#fff',
    color: disabled ? LRH.hairStrong : LRH.navy,
    border: '1px solid ' + (disabled ? LRH.hair : LRH.navy),
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  };

  if (disabled) {
    return (
      <span aria-disabled style={style}>
        {children}
      </span>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} style={style}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href} aria-label={ariaLabel} style={style}>
      {children}
    </Link>
  );
}

/**
 * Génère une liste compacte de numéros de page avec ellipses au-delà de 7 pages.
 *
 * Exemples (current=4, total=12) :   1 · 2 · 3 · [4] · 5 · 6 … 12
 * Exemples (current=1, total=12) :   [1] · 2 · 3 · 4 · 5 … 12
 * Exemples (current=12, total=12) :  1 … 8 · 9 · 10 · 11 · [12]
 * Exemples (current=4, total=5) :    1 · 2 · 3 · [4] · 5   (pas d'ellipse)
 */
function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '…')[] = [];
  const showLeft = current - 1 > 3;
  const showRight = total - current > 3;

  pages.push(1);
  if (showLeft) pages.push('…');

  const start = showLeft ? current - 1 : 2;
  const end = showRight ? current + 1 : total - 1;
  for (let p = start; p <= end; p++) {
    if (p > 1 && p < total) pages.push(p);
  }

  if (showRight) pages.push('…');
  pages.push(total);

  return pages;
}

// Helper paginate() déplacé vers lib/utils/paginate.ts pour pouvoir l'utiliser
// depuis des server components — un export d'un fichier 'use client' ne peut
// pas être appelé directement depuis le server (Next 16). On le ré-importe
// ici uniquement pour la rétrocompat des imports depuis '@/components/lrh/sections'.
// Re-export géré par sections/index.ts.
