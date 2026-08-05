'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SeasonSelector } from './SeasonSelector';

/**
 * Sélecteur de saison **piloté par l'URL**, pour les pages qui lisent
 * `searchParams` côté serveur (`/classements`, `/jeunes`).
 *
 * Il n'apporte que la navigation : le rendu vient du `SeasonSelector` partagé,
 * qui reste purement contrôlé et sert aussi les pages statiques
 * (`/competitions`, `/clubs/[slug]`) où `?season=` est interdit — cf. règle n°2,
 * un `searchParams` sur une page statique annule son `revalidate`.
 *
 * Fichier séparé de `SeasonSelector.tsx` **à dessein** : un module `'use client'`
 * n'est pas tree-shaké par export, donc réunir les deux ferait entrer
 * `useRouter`/`useSearchParams` dans le chunk des pages statiques qui n'en ont
 * pas besoin.
 *
 * ⚠️ La saison est **toujours** écrite dans l'URL, y compris pour la plus
 * récente. La version précédente (recopiée dans ClassementsPageClient)
 * supprimait le paramètre quand le choix valait `seasons[0]`, en supposant que
 * la première option était aussi le défaut du serveur. Ce n'est plus vrai
 * depuis que `/classements` retient la dernière saison ayant un RÉSULTAT :
 * choisir 2026-2027 effaçait le paramètre, le serveur répondait 2025-2026, et
 * le sélecteur revenait tout seul sur son point de départ — saison
 * inatteignable.
 */
export function SeasonUrlSelector({
  seasons,
  active,
  basePath,
  mobileVariant = false,
}: {
  /** Libellés au format base, du plus récent au plus ancien. */
  seasons: string[];
  active: string | null;
  /** Chemin de la page, sans query string (ex. `/classements`). */
  basePath: string;
  mobileVariant?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (season: string) => {
    // Les autres paramètres sont préservés : ces écrans en portent d'autres
    // (mode, compétition) et changer de saison ne doit pas les perdre.
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', season);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <SeasonSelector
      seasons={seasons}
      value={active}
      onChange={handleChange}
      mobileVariant={mobileVariant}
    />
  );
}
