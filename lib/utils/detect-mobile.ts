/**
 * Détection mobile heuristique basée sur le User-Agent.
 *
 * **Pourquoi** : sur ce projet, beaucoup de pages branchent
 * `isMobile ? <ComponentMobile/> : <ComponentDesktop/>` avec un
 * useState/useEffect côté client. Conséquence sur mobile :
 *
 *   1. Server-side rendering avec `isMobile = false` (valeur initiale).
 *   2. Le HTML envoyé contient la version DESKTOP.
 *   3. Client mount → React hydrate (avec isMobile=false par défaut).
 *   4. `useEffect` détecte `window.innerWidth < 1024` → setIsMobile(true).
 *   5. Re-render avec la version MOBILE → DOM remplacé.
 *
 * Effets de bord :
 *   - React error #418 ("Text content does not match server-rendered HTML")
 *     car le HTML hydraté (desktop) diffère de ce qu'aurait rendu le client.
 *   - Forced reflow : le re-render mobile invalide tous les styles inline.
 *   - Double execution JS : tout le sous-arbre est rendu 2 fois.
 *   - LCP retardé : l'image hero desktop est téléchargée puis remplacée.
 *
 * **Fix** : on lit le User-Agent server-side et on passe la valeur initiale
 * au client. L'hydration matche → pas de re-render. Une fois côté client,
 * le hook useIsMobile écoute matchMedia pour mettre à jour si l'user
 * passe en split-screen ou pivote son tablet.
 *
 * La détection UA est imparfaite (10-15% de faux positifs/négatifs sur les
 * tablets, browsers desktop avec UA mobile, etc.) mais c'est OK : on aura
 * UN seul render correct dans 85-90% des cas, et un re-render seulement
 * dans les edge cases.
 *
 * À utiliser dans tout server component qui rend un client wrapper qui
 * branche sur mobile/desktop.
 */
export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  // Pattern Google-recommandé pour la détection mobile via UA :
  // - "Mobi" : tous les UA mobile (incl. mobile Chrome, Firefox)
  // - "Android" + sans "Mobile" → tablette → on considère desktop (large viewport)
  // - "iPhone" / "iPod" : iOS phone
  // - "Tablet" : on considère desktop sauf si "Mobile" aussi
  //
  // Pas de regex sur "Android" seul car les tablettes Android sont desktop-like.
  const ua = userAgent;
  if (/iPhone|iPod/.test(ua)) return true;
  if (/Mobi/.test(ua)) {
    // Android tablet a souvent "Tablet" + pas "Mobile" mais on garde simple.
    return true;
  }
  return false;
}
