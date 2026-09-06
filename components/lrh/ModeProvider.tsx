'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Mode } from './sections/Header';

/**
 * Discipline affichée par défaut sur tout le site, et discipline CHOISIE par le
 * visiteur pendant sa navigation. Même découpage que `SeasonProvider`, dont ce
 * module est le pendant pour gazon/salle.
 *
 * Deux défauts d'expérience corrigés ici, tous deux dus au fait que chaque
 * écran tenait son propre `useState<Mode>('gazon')` :
 *
 * 1. **le mauvais défaut** — en pleine phase salle, le visiteur arrivait sur un
 *    calendrier et un classement gazon vides, à charge pour lui de deviner
 *    qu'un toggle existait. La valeur serveur (`lib/queries/activeMode.ts`)
 *    résout la discipline d'après les matchs réellement programmés ;
 * 2. **le choix qui ne suit pas** — basculer sur salle depuis `/classements`
 *    puis aller sur `/competitions` remettait gazon. Le choix est maintenant
 *    partagé par tous les écrans.
 *
 * Le toggle n'est pas retiré : on corrige le point de départ, on ne prive pas
 * le visiteur de la bascule.
 *
 * Coût (règle n°2) : aucun côté client. La valeur serveur vient d'une lecture
 * déjà enveloppée dans `cachePublic`, mutualisée dans le `Promise.all` du
 * layout racine — pas de vague de requêtes supplémentaire.
 *
 * ⚠️ Le choix vit **en mémoire**, comme la saison consultée : il survit aux
 * navigations client et se réinitialise à un rechargement complet. Le
 * persister en `localStorage` imposerait de le lire dans un effet, donc un
 * premier rendu à la mauvaise discipline suivi d'un saut visible.
 */

type ModeSelection = {
  /** Discipline en cours, résolue côté serveur. `null` = aucun match en base. */
  active: Mode | null;
  /** Choix explicite du visiteur, `null` tant qu'il n'a pas touché au toggle. */
  selected: Mode | null;
  select: (mode: Mode) => void;
};

const ModeContext = createContext<ModeSelection | null>(null);

export function ModeProvider({
  value,
  children,
}: {
  /** Discipline en cours au format base, résolue côté serveur. */
  value: 'GAZON' | 'SALLE' | null;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Mode | null>(null);
  const active: Mode | null = value === 'SALLE' ? 'salle' : value === 'GAZON' ? 'gazon' : null;

  // `setSelected` est stable : cet objet ne change qu'au choix d'une
  // discipline, les écrans qui en dépendent ne re-rendent pas pour rien.
  const selection = useMemo<ModeSelection>(
    () => ({ active, selected, select: setSelected }),
    [active, selected],
  );

  return <ModeContext.Provider value={selection}>{children}</ModeContext.Provider>;
}

/**
 * Remplacement direct de `useState<Mode>('gazon')` dans les écrans publics.
 *
 *   const [mode, setMode] = useMode();
 *
 * Rend, par ordre de priorité : le choix du visiteur, la discipline en cours
 * résolue côté serveur, puis `gazon` en dernier recours. Hors provider, se
 * comporte comme l'ancien `useState` local — jamais de crash.
 */
export function useMode(): [Mode, (mode: Mode) => void] {
  const ctx = useContext(ModeContext);
  const [fallback, setFallback] = useState<Mode>('gazon');

  const value = ctx ? (ctx.selected ?? ctx.active ?? 'gazon') : fallback;
  const select = ctx?.select;
  const change = useCallback(
    (m: Mode) => (select ? select(m) : setFallback(m)),
    [select],
  );

  return [value, change];
}

/**
 * Discipline en cours seule, sans le choix du visiteur. Pour les écrans qui
 * doivent annoncer la discipline de la ligue même si le visiteur en consulte
 * une autre ailleurs — pendant du `useSeason()` de `SeasonProvider`.
 */
export function useActiveMode(): Mode {
  return useContext(ModeContext)?.active ?? 'gazon';
}
