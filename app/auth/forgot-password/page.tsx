'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LRH, display, body, mono, LrhMark } from '@/components/lrh/tokens';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Erreur lors de la demande. Réessaye dans quelques instants.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Connexion impossible au serveur. Vérifie ta connexion réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: LRH.navy,
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#fff',
          borderRadius: 16,
          padding: 'clamp(24px, 4vw, 40px)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <LrhMark size={48} />
        </div>

        <h1
          style={{
            ...display,
            fontWeight: 800,
            fontSize: 24,
            textAlign: 'center',
            color: LRH.navy,
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}
        >
          Mot de passe oublié
        </h1>
        <p
          style={{
            ...body,
            fontSize: 13.5,
            color: LRH.mute,
            textAlign: 'center',
            marginBottom: 28,
            lineHeight: 1.55,
          }}
        >
          Entre ton email — si un compte existe, un lien de réinitialisation
          arrivera dans ta boîte mail (valable 60 minutes).
        </p>

        {submitted ? (
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
            ✓ Si un compte existe avec cet email, un lien de réinitialisation
            vient d&apos;être envoyé. Vérifie ta boîte mail (et tes spams).
          </div>
        ) : (
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
                Adresse Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                placeholder="email@exemple.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%',
                padding: '14px',
                background: !email ? LRH.hairStrong : LRH.red,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                ...display,
                fontWeight: 700,
                fontSize: 14,
                cursor: loading || !email ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Envoi...' : 'Recevoir le lien'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <Link
            href="/auth/login"
            style={{
              ...mono,
              fontSize: 10.5,
              color: LRH.mute,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            ◂ Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
