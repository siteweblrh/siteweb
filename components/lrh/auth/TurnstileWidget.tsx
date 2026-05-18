'use client';

import React, { useCallback, useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement | string, opts: TurnstileOptions) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    onLrhTurnstileLoad?: () => void;
  }
}

type TurnstileOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
};

// Test key publique Cloudflare — always-pass. Permet au formulaire login de
// fonctionner en dev avant que le user configure ses vraies clés.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * Widget Cloudflare Turnstile. Mount le widget officiel et appelle onVerify
 * avec le token quand le challenge passe. Reset auto à expiration ou erreur.
 *
 * En dev sans NEXT_PUBLIC_TURNSTILE_SITE_KEY, utilise la test key Cloudflare
 * qui passe automatiquement (affiche un challenge "test" trivial).
 */
export function TurnstileWidget({
  onVerify,
  theme = 'light',
}: {
  onVerify: (token: string) => void;
  theme?: 'light' | 'dark' | 'auto';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TEST_SITE_KEY;

  const render = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;
    // Reset si déjà monté
    if (widgetIdRef.current) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': () => onVerify(''),
      'error-callback': () => onVerify(''),
      theme,
    });
  }, [siteKey, onVerify, theme]);

  useEffect(() => {
    if (window.turnstile) {
      render();
    } else {
      window.onLrhTurnstileLoad = () => render();
      const existing = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
      );
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onLrhTurnstileLoad';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [render]);

  return <div ref={containerRef} />;
}
