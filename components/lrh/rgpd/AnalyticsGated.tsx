'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

/**
 * Wrapper qui ne monte Vercel Analytics QUE si l'utilisateur a consenti via
 * le bandeau cookies. Écoute l'event `lrh:cookie-consent` pour réagir au
 * choix sans rechargement de page.
 *
 * Conformité CNIL : aucune requête vers vercel-insights tant que pas
 * d'accord explicite. Le composant Analytics ne pose ses cookies / ne
 * fait ses requêtes qu'au moment où il est monté.
 */
export function AnalyticsGated() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Read initial choice from localStorage (set par le bandeau).
    try {
      const raw = localStorage.getItem('lrh.cookie-consent');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.analytics === true) setEnabled(true);
      }
    } catch {}

    // Réagit aux changements de consent (acceptation/refus pendant la session).
    const onConsentChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setEnabled(detail?.analytics === true);
    };
    window.addEventListener('lrh:cookie-consent', onConsentChange);
    return () => window.removeEventListener('lrh:cookie-consent', onConsentChange);
  }, []);

  if (!enabled) return null;
  return <Analytics />;
}
