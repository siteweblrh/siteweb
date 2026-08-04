'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SeasonFilter, ALL_SEASONS } from './SeasonFilter';

/**
 * Îlot client autour de `SeasonFilter`, pour les écrans d'admin rendus côté
 * serveur : la saison retenue vit dans l'URL (`?season=`), le filtrage se fait
 * donc sur le serveur.
 *
 * Pourquoi cette variante plutôt qu'un état local : sur un Server Component,
 * passer au filtrage client obligerait à extraire tout le rendu dans un
 * composant client — sur /dashboard/standings, environ 260 lignes de JSX.
 * L'îlot ne déplace que le contrôle.
 *
 * Effet de bord bienvenu : le filtre devient partageable et survit au
 * rechargement, ce qui a du sens sur un écran de travail.
 *
 * Sans coût de rendu : les pages du dashboard sont déjà dynamiques (`ƒ`), lire
 * `searchParams` n'y change aucune stratégie de cache — contrairement au site
 * public, où ce serait une régression (cf. /competitions).
 */
export function SeasonFilterNav({
  seasons,
  value,
  label,
}: {
  seasons: string[];
  value: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onChange = (v: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (v === ALL_SEASONS) params.delete('season');
    else params.set('season', v);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return <SeasonFilter seasons={seasons} value={value} onChange={onChange} label={label} />;
}
