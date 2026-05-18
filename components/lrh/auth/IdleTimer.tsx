'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { LRH, mono, display, body } from '../tokens';

/**
 * Détecte l'inactivité et déclenche une déconnexion automatique.
 * Affiche un modal d'avertissement à `warningBeforeMs` avant le logout, qui
 * laisse l'utilisateur cliquer "Rester connecté" pour reset le timer.
 *
 * Branché sur les events DOM globaux : mousemove, mousedown, keydown,
 * touchstart, scroll. Ces events sont "passifs" (n'empêchent pas le
 * comportement natif).
 *
 * Server-aligned : la session NextAuth a un maxAge de 30 min (cf. auth.config),
 * donc même si ce composant n'est pas monté, le JWT expirera côté serveur.
 * Ce composant est là pour 1) couper UX-side immédiatement, 2) avertir avant.
 */
export function IdleTimer({
  idleMs = 30 * 60 * 1000, // 30 min total
  warningBeforeMs = 60 * 1000, // warning à 1 min de la fin
}: {
  idleMs?: number;
  warningBeforeMs?: number;
}) {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(warningBeforeMs / 1000));
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doLogout = useCallback(async () => {
    try {
      await signOut({ callbackUrl: '/auth/login?reason=idle' });
    } catch {
      window.location.href = '/auth/login?reason=idle';
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
    countdownIntervalRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearAllTimers();
    setWarningOpen(false);
    setSecondsLeft(Math.floor(warningBeforeMs / 1000));

    // 1) Warning timer : déclenche le modal à idleMs - warningBeforeMs
    const warnAfter = Math.max(0, idleMs - warningBeforeMs);
    warningTimerRef.current = setTimeout(() => {
      setWarningOpen(true);
      // démarre le countdown visible
      let left = Math.floor(warningBeforeMs / 1000);
      setSecondsLeft(left);
      countdownIntervalRef.current = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        } else {
          setSecondsLeft(left);
        }
      }, 1000);
    }, warnAfter);

    // 2) Logout timer : déclenche signOut au bout de idleMs
    logoutTimerRef.current = setTimeout(() => {
      doLogout();
    }, idleMs);
  }, [idleMs, warningBeforeMs, doLogout, clearAllTimers]);

  // Reset au moindre signe d'activité, MAIS uniquement si le modal n'est PAS ouvert.
  // Si le modal est affiché, on attend le clic explicite "Rester connecté" pour
  // éviter de reset si l'utilisateur a juste bougé la souris sans intention.
  const handleActivity = useCallback(() => {
    if (warningOpen) return;
    startTimers();
  }, [warningOpen, startTimers]);

  useEffect(() => {
    // Démarre les timers à la mount
    startTimers();

    const events: (keyof DocumentEventMap)[] = [
      'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll',
    ];
    events.forEach((ev) => document.addEventListener(ev, handleActivity, { passive: true }));

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleActivity));
      clearAllTimers();
    };
  }, [handleActivity, startTimers, clearAllTimers]);

  if (!warningOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const displayTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 17, 34, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#fff',
          border: `4px solid ${LRH.gold}`,
          borderTop: `4px solid ${LRH.red}`,
          padding: '28px 26px 24px',
        }}
      >
        <div
          style={{
            ...mono, fontSize: 10.5, fontWeight: 700,
            color: LRH.red, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 10,
          }}
        >
          ▸ Inactivité détectée
        </div>
        <h2
          id="idle-warning-title"
          style={{
            ...display, fontWeight: 800,
            fontSize: 24, color: LRH.navy,
            letterSpacing: '-0.025em', margin: 0,
            lineHeight: 1.1,
          }}
        >
          Vous allez être déconnecté.
        </h2>
        <p
          style={{
            ...body, fontSize: 14, color: LRH.ink2,
            margin: '12px 0 18px', lineHeight: 1.55,
          }}
        >
          Pour des raisons de sécurité, votre session sera fermée dans :
        </p>
        <div
          style={{
            ...display, fontWeight: 800,
            fontSize: 48, color: LRH.navy,
            letterSpacing: '-0.04em',
            textAlign: 'center',
            padding: '8px 0 20px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {displayTime}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={startTimers}
            style={{
              flex: 1,
              ...mono, fontSize: 11.5, fontWeight: 700,
              padding: '12px 18px',
              background: LRH.navy, color: '#fff',
              border: 'none', cursor: 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            Rester connecté
          </button>
          <button
            type="button"
            onClick={doLogout}
            style={{
              ...mono, fontSize: 11.5, fontWeight: 700,
              padding: '12px 18px',
              background: 'transparent', color: LRH.red,
              border: `1px solid ${LRH.red}`, cursor: 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              fontFamily: 'inherit',
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
