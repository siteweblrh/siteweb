'use client';

import { useEffect, useState } from 'react';

/**
 * Hook centralisé pour détecter si l'on est sous le breakpoint mobile.
 *
 * **Crucial** : passer `initialValue` (= heuristique UA détectée server-side
 * via `isMobileUserAgent` dans lib/utils/detect-mobile.ts) pour ÉVITER le
 * hydration mismatch React #418.
 *
 * Sans `initialValue`, le hook part de `false` (desktop) côté server, ce qui
 * sur un user mobile force un re-render complet après mount et déclenche
 * #418 + forced reflow + double execution JS.
 *
 * Source unique pour tout le projet — remplace les 15+ copies de
 * `function useIsMobile() { ... }` éparpillées dans components/lrh/pages/*.
 *
 * ## Usage
 *
 * Dans un server component qui passe la valeur initiale :
 * ```tsx
 * import { headers } from 'next/headers';
 * import { isMobileUserAgent } from '@/lib/utils/detect-mobile';
 *
 * export default async function Page() {
 *   const ua = (await headers()).get('user-agent');
 *   const ssrIsMobile = isMobileUserAgent(ua);
 *   return <MyClientWrapper ssrIsMobile={ssrIsMobile} />;
 * }
 * ```
 *
 * Dans le client component :
 * ```tsx
 * 'use client';
 * import { useIsMobile } from '@/lib/hooks/use-is-mobile';
 *
 * export function MyClientWrapper({ ssrIsMobile }: { ssrIsMobile: boolean }) {
 *   const isMobile = useIsMobile(ssrIsMobile);
 *   return isMobile ? <Mobile /> : <Desktop />;
 * }
 * ```
 */
export function useIsMobile(initialValue = false, breakpointPx = 1024): boolean {
  const [isMobile, setIsMobile] = useState(initialValue);

  useEffect(() => {
    // matchMedia plutôt que resize listener — event uniquement au franchissement
    // du breakpoint, pas à chaque pixel.
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler(); // synchronise avec la valeur réelle (au cas où l'UA aurait menti)
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpointPx]);

  return isMobile;
}
