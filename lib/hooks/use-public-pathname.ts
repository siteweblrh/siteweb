'use client';

import { usePathname } from 'next/navigation';

/**
 * `usePathname` normalisé pour les alias serveur de la home. Deux cas où le
 * pathname vu au SSR n'est PAS celui de la barre d'adresse du navigateur :
 *
 *   - `/m` : variante mobile de la home, servie via le rewrite UA de proxy.ts.
 *     Le navigateur affiche `/`, mais le rendu serveur voit `/m`.
 *   - `/index` : chemin interne utilisé par Vercel quand il invoque la route
 *     racine (prerender/revalidation ISR). Constaté en prod le 19/07/2026 :
 *     l'entrée ISR de `/` était rendue avec pathname `/index`.
 *
 * Conséquence sans normalisation : l'état actif de la nav (lien « Accueil »
 * du header desktop, onglet Accueil de la MobileTabBar) diffère entre le HTML
 * SSR et le rendu client → React #418 à CHAQUE chargement de la home → tout
 * l'arbre est régénéré côté client → le héro (élément LCP) repeint après le
 * bootup JS (PSI mobile plafonné à ~73-75).
 *
 * À utiliser partout où le pathname sert à un état actif/inactif rendu au SSR.
 */
export function usePublicPathname(): string {
  const pathname = usePathname() ?? '/';
  return pathname === '/m' || pathname === '/index' ? '/' : pathname;
}
