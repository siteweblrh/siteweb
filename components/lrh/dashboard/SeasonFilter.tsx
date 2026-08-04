'use client';

import React from 'react';
import { LRH, mono } from '@/components/lrh/tokens';

/** Valeur du filtre quand aucune saison n'est retenue. */
export const ALL_SEASONS = '__all__';

/**
 * Filtre de saison des écrans d'administration.
 *
 * Distinct du `SeasonSelector` public (components/lrh/sections/) à dessein :
 * côté public on **choisit une** saison à consulter, côté admin on travaille
 * souvent en travers — préparer 2027-2028 en consultant 2026-2027. D'où
 * l'option « Toutes », qui n'a pas de sens sur le site public.
 *
 * Des chips plutôt qu'un `<select>` : en admin, voir d'un coup d'œil combien
 * de saisons existent et laquelle est active vaut mieux qu'un menu fermé.
 * Chaque chip est un `<button>` dans un groupe `radiogroup` — navigable au
 * clavier et annoncé comme un choix, pas comme une liste d'actions.
 */
export function SeasonFilter({
  seasons,
  value,
  onChange,
  label = 'Saison',
}: {
  /** Libellés au format base, du plus récent au plus ancien. */
  seasons: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  // Une seule saison : le filtre n'offre aucun choix réel.
  if (seasons.length <= 1) return null;

  const options = [{ v: ALL_SEASONS, l: 'Toutes' }, ...seasons.map((s) => ({ v: s, l: s.replace(/-/g, '–') }))];

  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
    >
      <span
        style={{
          ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}
      >
        ◉ {label}
      </span>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.v)}
            style={{
              ...mono, fontSize: 11, fontWeight: 700,
              // 40px : on est en densité admin, pas sur mobile grand public.
              // Reste au-dessus du seuil de confort au trackpad.
              minHeight: 40, padding: '0 14px',
              border: `1px solid ${active ? LRH.navy : LRH.hairStrong}`,
              background: active ? LRH.navy : '#fff',
              color: active ? '#fff' : LRH.ink2,
              borderRadius: 4, cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Saisons distinctes présentes dans une liste, de la plus récente à la plus
 * ancienne. Déduites des données affichées, jamais d'une liste figée : un
 * écran ne doit proposer que ce qu'il peut réellement montrer.
 */
export function seasonsOf<T>(items: T[], get: (item: T) => string | null | undefined): string[] {
  const set = new Set<string>();
  for (const it of items) {
    const s = get(it);
    if (s) set.add(s);
  }
  return [...set].sort().reverse();
}
