'use client';

import React, { useId } from 'react';
import { LRH, mono } from '../tokens';

/**
 * Sélecteur de saison, **purement contrôlé** : il reçoit une valeur et remonte
 * un choix, sans rien savoir de l'URL.
 *
 * Pourquoi cette forme : deux implémentations quasi identiques existaient déjà,
 * dans ClassementsPageClient et JeunesPageClient, toutes deux couplées au
 * routeur (`router.push('?season=…')`). `/competitions` en avait besoin d'une
 * troisième — mais cette page est **statique**, et y introduire `searchParams`
 * la rendrait dynamique, donc payante à chaque visite côté Neon (cf. règle n°2
 * et l'incident du 27 juillet).
 *
 * En sortant la navigation du composant, la même UI sert les deux usages :
 * les pages dynamiques passent un `onChange` qui pousse dans l'URL, les pages
 * statiques un `onChange` qui met à jour un état local.
 *
 * Accessibilité : `<select>` natif — navigable au clavier et annoncé
 * correctement, là où une liste de boutons stylés demanderait de réimplémenter
 * tout le comportement. Le label est lié par `htmlFor`, et reste visible plutôt
 * que caché derrière un `aria-label` seul.
 */
export function SeasonSelector({
  seasons,
  value,
  onChange,
  mobileVariant = false,
  label = 'Saison',
}: {
  /** Libellés au format base (« 2025-2026 »), du plus récent au plus ancien. */
  seasons: string[];
  value: string | null;
  onChange: (season: string) => void;
  mobileVariant?: boolean;
  label?: string;
}) {
  const id = useId();
  // Un seul choix possible n'est pas un choix : on n'affiche rien plutôt qu'un
  // sélecteur inerte qui laisse croire qu'il y a autre chose à voir.
  if (seasons.length <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#fff',
        border: '1px solid ' + LRH.hairStrong,
        borderLeft: `3px solid ${LRH.gold}`,
        padding: mobileVariant ? '6px 10px' : '8px 14px',
      }}
    >
      <label
        htmlFor={id}
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 800,
          color: LRH.gold,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        ◉ {label}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...mono,
          fontSize: 11,
          fontWeight: 700,
          color: LRH.navy,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          // Cible tactile : le conteneur fait le reste de la hauteur.
          minHeight: 32,
        }}
      >
        {seasons.map((s) => (
          <option key={s} value={s}>
            {s.replace(/-/g, '–')}
          </option>
        ))}
      </select>
    </div>
  );
}
