'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LRH, display, body, mono, LrhLockup } from '@/components/lrh/tokens';
import { PasswordField } from '@/components/lrh/auth/PasswordField';

export function ChangePasswordForm({ userName }: { userName: string | null }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'Erreur lors de la mise à jour.');
        return;
      }
      setDone(true);
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/login' });
      }, 2500);
    } catch {
      setError('Connexion impossible au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    ...mono,
    fontSize: 10,
    color: LRH.mute,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: 8,
  };

  if (done) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: LRH.navy, padding: 20,
      }}>
        <div style={{
          width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16,
          padding: 40, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <LrhLockup height={56} />
          </div>
          <div style={{
            padding: 16,
            background: 'rgba(29,107,63,0.08)',
            border: '1px solid rgba(29,107,63,0.3)',
            borderLeft: '3px solid #1d6b3f',
            color: '#0f4527',
            ...body,
            fontSize: 13,
            lineHeight: 1.55,
            textAlign: 'center',
          }}>
            Mot de passe mis à jour. Reconnexion en cours…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: LRH.navy, padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16,
        padding: 40, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <LrhLockup height={56} />
        </div>

        <h1 style={{
          ...display, fontWeight: 800, fontSize: 22, textAlign: 'center',
          color: LRH.navy, marginBottom: 8,
        }}>
          Modification obligatoire
        </h1>
        <p style={{
          ...body, fontSize: 13, color: LRH.mute, textAlign: 'center',
          marginBottom: 8, lineHeight: 1.5,
        }}>
          {userName ? `Bienvenue ${userName}.` : 'Bienvenue.'} Pour accéder au tableau de bord,
          vous devez définir un mot de passe personnel et sécurisé.
        </p>

        <div style={{
          padding: '10px 14px',
          background: 'rgba(243,188,28,0.10)',
          border: '1px solid ' + LRH.gold,
          borderLeft: `3px solid ${LRH.gold}`,
          color: LRH.ink,
          ...mono,
          fontSize: 10,
          marginBottom: 24,
          lineHeight: 1.6,
          letterSpacing: '0.04em',
        }}>
          Votre mot de passe temporaire vous a été communiqué par la ligue.
          Tant que cette étape n&apos;est pas complétée, le tableau de bord reste bloqué.
        </div>

        {error && (
          <div style={{
            padding: '11px 14px', background: '#FEF2F2', border: '1px solid #F87171',
            color: '#991B1B', ...body, fontSize: 13, marginBottom: 18,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="cp-current" style={labelStyle}>
              Mot de passe actuel (temporaire)
            </label>
            <PasswordField
              id="cp-current"
              value={currentPassword}
              onChange={setCurrentPassword}
              required
              autoComplete="current-password"
              autoFocus
              placeholder="Mot de passe fourni par la ligue"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label htmlFor="cp-new" style={labelStyle}>
              Nouveau mot de passe
            </label>
            <PasswordField
              id="cp-new"
              value={newPassword}
              onChange={setNewPassword}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Min. 8 caractères"
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label htmlFor="cp-confirm" style={labelStyle}>
              Confirmer le nouveau mot de passe
            </label>
            <PasswordField
              id="cp-confirm"
              value={confirm}
              onChange={setConfirm}
              required
              autoComplete="new-password"
              placeholder="Retapez le même"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirm}
            style={{
              width: '100%',
              padding: '14px',
              background: (!currentPassword || !newPassword || !confirm) ? LRH.hairStrong : LRH.red,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              ...display,
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Mise à jour…' : 'Définir mon nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
