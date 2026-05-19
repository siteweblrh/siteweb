'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LRH, mono, body } from '../tokens';

/**
 * Bandeau de consentement RGPD/CNIL.
 *
 * Conformité CNIL :
 *   - Aucun cookie non-essentiel n'est posé tant que l'utilisateur n'a pas
 *     fait son choix (accept OU refuse). Le bandeau ne pré-coche rien.
 *   - Refuser doit être aussi simple qu'accepter (2 boutons côte à côte,
 *     même style visuel).
 *   - Le choix est stocké dans localStorage avec horodatage. Re-soumis
 *     pour acceptation après 13 mois (durée légale max).
 *
 * Catégories gérées :
 *   - Nécessaire : NextAuth session, Turnstile (security challenge). Toujours
 *     actif, pas d'opt-out (légalement permis car indispensable au service).
 *   - Mesure d'audience : Vercel Analytics (Web Vitals + pageviews anonymes).
 *     Conditionnel au consent.
 *
 * Pas de tracking marketing/pub sur LRH, donc pas d'autres catégories.
 */

const STORAGE_KEY = 'lrh.cookie-consent';
const MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // 13 mois

type Consent = {
  analytics: boolean;
  timestamp: number; // epoch ms
};

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    if (Date.now() - parsed.timestamp > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(c: Omit<Consent, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  const stored: Consent = { ...c, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  // Event custom pour que d'autres composants (analytics loader) puissent réagir.
  window.dispatchEvent(new CustomEvent('lrh:cookie-consent', { detail: stored }));
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // On vérifie au mount client (jamais SSR pour éviter le flash).
    const existing = readConsent();
    if (!existing) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    writeConsent({ analytics: true });
    setVisible(false);
  };
  const refuse = () => {
    writeConsent({ analytics: false });
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 80,
        maxWidth: 720,
        margin: '0 auto',
        background: LRH.navyDeep,
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.12)',
        borderLeft: '4px solid ' + LRH.gold,
        padding: 'clamp(14px, 2vw, 18px) clamp(16px, 2.4vw, 22px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          ...mono,
          fontSize: 10,
          color: LRH.gold,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        ◆ Cookies & mesure d&apos;audience
      </div>
      <p
        style={{
          ...body,
          fontSize: 13,
          lineHeight: 1.55,
          color: 'rgba(255,255,255,0.82)',
          margin: 0,
        }}
      >
        On utilise des cookies <strong style={{ color: '#fff' }}>strictement
        nécessaires</strong> au fonctionnement du site (session de connexion)
        et, avec ton accord, une mesure d&apos;audience anonyme pour comprendre
        ce qui marche. Aucun pistage publicitaire. Ton choix est conservé 13 mois.
      </p>
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={accept}
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            padding: '12px 20px',
            background: LRH.gold,
            color: LRH.navy,
            border: 'none',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Tout accepter
        </button>
        <button
          type="button"
          onClick={refuse}
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            padding: '12px 20px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.4)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          Refuser
        </button>
        <Link
          href="/politique-confidentialite"
          style={{
            ...mono,
            fontSize: 10.5,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.12em',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(255,255,255,0.3)',
            textUnderlineOffset: 3,
            marginLeft: 4,
          }}
        >
          En savoir plus
        </Link>
      </div>
    </div>
  );
}
