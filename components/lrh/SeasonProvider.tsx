'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { currentSeason } from '@/lib/utils/season';

/**
 * Saison affichée sur tout le site, injectée UNE fois depuis `app/layout.tsx`,
 * ET saison **consultée** par le visiteur quand il en choisit une.
 *
 * Deux notions distinctes, à ne pas confondre (c'est tout le fichier) :
 *
 * - **la saison de la LIGUE** — `useSeason()`. Résolue côté serveur
 *   (`season.current` → `Season.EN_COURS` → règle de calendrier). C'est ce
 *   qu'affichent le header sur les pages sans dimension saison, le hero
 *   d'accueil et les tags de `/ligue` ou `/formation`. Elle ne change JAMAIS
 *   côté client.
 * - **la saison CONSULTÉE** — le choix du visiteur dans un sélecteur. Elle ne
 *   vaut que pour les écrans qui ont une dimension saison, et elle le suit d'un
 *   écran à l'autre pendant sa navigation. C'est la seule chose que ce provider
 *   met en mémoire.
 *
 * Coût (règle n°2) — portée : 100 % des pages, dashboard compris, puisque le
 * provider vit dans le layout racine. Fréquence : la valeur serveur vient de
 * lectures déjà enveloppées dans `cachePublic` (fenêtre 1 h + invalidation par
 * tag), donc de l'ordre d'UNE lecture Neon par heure pour le site entier.
 * **La saison consultée ne coûte rien** : aucune requête n'a été ajoutée au
 * layout, chaque écran fournit ses propres options à son header. Mode de
 * défaillance : si la lecture serveur échoue, `value` arrive à `null` et on
 * retombe sur la règle de calendrier — jamais de case vide.
 *
 * ⚠️ Le choix vit **en mémoire** : il survit aux navigations client (le layout
 * racine n'est pas démonté) et se réinitialise à un rechargement complet.
 * Délibéré — le persister en `localStorage` imposerait de le lire dans un effet
 * pour éviter une divergence d'hydratation, donc un premier rendu à la
 * mauvaise saison suivi d'un saut visible.
 */

/** Ce qu'un écran fournit à son header pour qu'il affiche un sélecteur. */
export type SeasonScope = {
  /** Libellés proposés, du plus récent au plus ancien. */
  seasons: string[];
  /** Saison réellement affichée par l'écran. */
  value: string | null;
  onChange: (season: string) => void;
};

const LeagueSeasonContext = createContext<string | null>(null);

type Selection = { selected: string | null; select: (season: string) => void };
const SelectionContext = createContext<Selection | null>(null);

export function SeasonProvider({
  value,
  children,
}: {
  /** Saison de la ligue, résolue côté serveur. Chaîne vide ou null = auto. */
  value: string | null;
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // `setSelected` est stable, donc cet objet ne change qu'au choix d'une saison
  // — les écrans qui en dépendent ne re-rendent pas pour rien.
  const selection = useMemo<Selection>(() => ({ selected, select: setSelected }), [selected]);

  return (
    <LeagueSeasonContext.Provider value={value && value.length > 0 ? value : null}>
      <SelectionContext.Provider value={selection}>{children}</SelectionContext.Provider>
    </LeagueSeasonContext.Provider>
  );
}

/**
 * Saison de la LIGUE, au format base (`"2025-2026"`).
 *
 * ⚠️ Ne rend **pas** la saison consultée : un écran sans dimension saison (la
 * home, `/ligue`, `/licence`) doit continuer d'annoncer la saison en cours même
 * si le visiteur consulte 2024-2025 ailleurs. Sans quoi le hero d'accueil
 * porterait un libellé qui contredit les données qu'il affiche.
 *
 * Hors provider, retombe sur la règle de calendrier — jamais de crash.
 */
export function useSeason(): string {
  return useContext(LeagueSeasonContext) ?? currentSeason();
}

/**
 * Écrans filtrés CÔTÉ CLIENT (`/competitions`, `/clubs/[slug]`) : la saison
 * consultée est directement l'état d'affichage, aucun aller-retour serveur.
 *
 * Le choix global est adopté **s'il fait partie des options de cet écran**,
 * sinon on retombe sur le défaut de l'écran. C'est ce qui préserve le repli de
 * la fiche club : un club qui ne joue pas la saison consultée affiche sa saison
 * la plus récente plutôt qu'une page vide. Corollaire utile sur `/clubs/[slug]` :
 * changer de discipline change les saisons disponibles, et une sélection qui
 * n'y figure plus retombe seule sur le défaut, sans effet dédié.
 */
export function useClientSeason({
  seasons,
  fallback,
}: {
  seasons: string[];
  fallback: string | null;
}): [string | null, (season: string) => void] {
  const selection = useContext(SelectionContext);
  const selected = selection?.selected ?? null;
  const select = selection?.select;

  const value = selected && seasons.includes(selected) ? selected : fallback;
  const change = useCallback((s: string) => select?.(s), [select]);

  return [value, change];
}

/**
 * Écrans scopés CÔTÉ SERVEUR via `?season=` (`/classements`, `/jeunes`) : la
 * valeur affichée reste celle qu'a rendue le serveur, jamais une valeur locale
 * — sinon le sélecteur annoncerait une saison dont les données ne sont pas à
 * l'écran.
 *
 * Deux conséquences :
 *
 * 1. changer de saison **navigue** (`push`), il n'y a pas d'autre moyen ;
 * 2. arriver sur ces écrans avec un choix global divergent déclenche un
 *    `replace` pour l'adopter. Cet aller-retour ne se produit que si le
 *    visiteur a explicitement choisi une saison ailleurs — tant qu'il n'a rien
 *    touché, `selected` vaut `null` et la page s'affiche directement au bon
 *    endroit. `replace` et non `push` pour ne pas polluer le bouton Retour.
 *
 * Côté coût : ces deux pages sont déjà dynamiques et leurs lectures passent par
 * `cachePublic`, donc le rendu supplémentaire ne réveille pas Neon.
 */
export function useServerSeason({
  seasons,
  value,
  basePath,
}: {
  seasons: string[];
  /** Saison rendue par le serveur, depuis `searchParams`. */
  value: string | null;
  /** Chemin de la page, sans query string (ex. `/classements`). */
  basePath: string;
}): (season: string) => void {
  const selection = useContext(SelectionContext);
  const selected = selection?.selected ?? null;
  const select = selection?.select;
  const router = useRouter();

  const change = useCallback(
    (s: string) => {
      select?.(s);
      router.push(`${basePath}?season=${encodeURIComponent(s)}`);
    },
    [select, router, basePath],
  );

  const seasonsKey = seasons.join('|');
  useEffect(() => {
    if (!selected || selected === value) return;
    if (!seasonsKey.split('|').includes(selected)) return;
    router.replace(`${basePath}?season=${encodeURIComponent(selected)}`);
  }, [selected, value, seasonsKey, basePath, router]);

  return change;
}
