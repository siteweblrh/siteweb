'use client';

import React, { useId } from 'react';
import { LRH, mono, body } from '@/components/lrh/tokens';

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
 * ⚠️ Une liste déroulante, PAS des chips. Première version livrée en chips ;
 * corrigée sur remarque de l'user le 2026-08-04 : « au bout de la 10ᵉ saison
 * on sera embêté ». Une ligne de chips grandit indéfiniment et finit par
 * pousser le reste de la barre d'outils hors écran, alors qu'un `<select>`
 * garde une largeur constante quel que soit le nombre de saisons. Un composant
 * d'archive doit être dimensionné pour l'année 10, pas pour l'année 2.
 *
 * `<select>` natif : navigable au clavier et annoncé correctement, là où une
 * liste de boutons stylés demanderait de réimplémenter tout le comportement.
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
  const id = useId();
  // Une seule saison : le filtre n'offre aucun choix réel.
  if (seasons.length <= 1) return null;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <label
        htmlFor={id}
        style={{
          ...mono, fontSize: 10, fontWeight: 700, color: LRH.mute,
          letterSpacing: '0.16em', textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}
      >
        ◉ {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...body, fontSize: 12.5, fontWeight: 600,
          // 40px : densité admin, au-dessus du seuil de confort au trackpad.
          minHeight: 40, padding: '0 10px',
          border: '1px solid ' + LRH.hairStrong,
          borderLeft: `3px solid ${LRH.gold}`,
          borderRadius: 4, background: '#fff', color: LRH.ink,
          cursor: 'pointer',
        }}
      >
        <option value={ALL_SEASONS}>Toutes les saisons</option>
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s.replace(/-/g, '–')}
          </option>
        ))}
      </select>
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
