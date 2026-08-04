'use client';

import { createContext, useContext } from 'react';
import { currentSeason } from '@/lib/utils/season';

/**
 * Saison affichée sur tout le site, injectée UNE fois depuis `app/layout.tsx`.
 *
 * Pourquoi un contexte plutôt qu'une prop : le Header est monté par 18 clients
 * de page. Faire descendre une prop `season` depuis 18 Server Components — dont
 * la plupart n'ont aucune autre raison de connaître la saison — était un diff
 * massif sur du code en production (règle n°1). Le contexte règle le problème
 * en un point.
 *
 * Coût (règle n°2) — portée : 100 % des pages, dashboard compris, puisque le
 * provider vit dans le layout racine. Fréquence : la valeur vient de
 * `getContent('season.current')`, déjà enveloppé dans `cachePublic` (fenêtre
 * 1 h + invalidation par le tag `siteContent` à chaque édition admin), donc de
 * l'ordre d'UNE lecture Neon par heure pour le site entier — pas une par visite.
 * Mode de défaillance : si la lecture échoue, `value` arrive à `null` et on
 * retombe sur la règle de calendrier `currentSeason()`. Le site affiche une
 * saison plausible, jamais une case vide.
 */
const SeasonContext = createContext<string | null>(null);

export function SeasonProvider({
  value,
  children,
}: {
  /** Surcharge admin (`season.current`). Chaîne vide ou null = mode auto. */
  value: string | null;
  children: React.ReactNode;
}) {
  return (
    <SeasonContext.Provider value={value && value.length > 0 ? value : null}>
      {children}
    </SeasonContext.Provider>
  );
}

/**
 * Saison à afficher, au format base (`"2025-2026"`).
 *
 * Rend la surcharge admin si elle est renseignée, sinon la saison déduite du
 * calendrier. Utilisable dans n'importe quel composant client sous le layout
 * racine ; hors provider, retombe aussi sur le calendrier — donc jamais de
 * crash ni de valeur vide.
 */
export function useSeason(): string {
  return useContext(SeasonContext) ?? currentSeason();
}
