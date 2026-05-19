'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LRH, display, body, mono } from '@/components/lrh/tokens';

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? 'Erreur lors de la mise à jour. Réessaye.');
        return;
      }
      setDone(true);
      // Redirection vers la page de connexion après 2.5s.
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch {
      setError('Connexion impossible au serveur.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          padding: 16,
          background: 'rgba(29,107,63,0.08)',
          border: '1px solid rgba(29,107,63,0.3)',
          borderLeft: '3px solid #1d6b3f',
          color: '#0f4527',
          ...body,
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        ✓ Mot de passe mis à jour. Redirection vers la connexion…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            padding: '11px 14px',
            background: '#FEF2F2',
            border: '1px solid #F87171',
            color: '#991B1B',
            ...body,
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Nouveau mot de passe
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1.5px solid ' + LRH.hairStrong,
            ...body,
            fontSize: 16,
            outline: 'none',
            color: LRH.navy,
            background: '#fff',
          }}
          placeholder="Min. 8 caractères"
        />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label
          style={{
            ...mono,
            fontSize: 10,
            color: LRH.mute,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Confirmer
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1.5px solid ' + LRH.hairStrong,
            ...body,
            fontSize: 16,
            outline: 'none',
            color: LRH.navy,
            background: '#fff',
          }}
          placeholder="Retape le même"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        style={{
          width: '100%',
          padding: '14px',
          background: !password || !confirm ? LRH.hairStrong : LRH.red,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          ...display,
          fontWeight: 700,
          fontSize: 14,
          cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Mise à jour...' : 'Définir mon mot de passe'}
      </button>
    </form>
  );
}
