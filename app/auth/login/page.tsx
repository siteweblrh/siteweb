'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LRH, display, body, mono, LrhMark } from '@/components/lrh/tokens';
import { TurnstileWidget } from '@/components/lrh/auth/TurnstileWidget';

function LoginPageInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'idle') {
      setInfo("Vous avez été déconnecté pour inactivité. Reconnectez-vous pour reprendre.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    if (!turnstileToken) {
      setError('Vérification anti-bot non complétée. Patientez quelques secondes.');
      setLoading(false);
      return;
    }

    try {
      const res = await signIn('credentials', {
        email,
        password,
        turnstileToken,
        redirect: false,
      });

      if (res?.error) {
        setError('Identifiants invalides ou vérification échouée.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

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
          <LrhMark size={48} />
        </div>

        <h1 style={{
          ...display, fontWeight: 800, fontSize: 24, textAlign: 'center',
          color: LRH.navy, marginBottom: 8,
        }}>
          Connexion
        </h1>
        <p style={{
          ...body, fontSize: 14, color: LRH.mute, textAlign: 'center',
          marginBottom: 28,
        }}>
          Accédez au portail de la LRH
        </p>

        {info && (
          <div style={{
            padding: '11px 14px', background: 'rgba(243,188,28,0.10)',
            border: '1px solid ' + LRH.gold, borderLeft: `3px solid ${LRH.gold}`,
            color: LRH.ink, ...body, fontSize: 12.5, marginBottom: 18, lineHeight: 1.5,
          }}>
            ⓘ {info}
          </div>
        )}

        {error && (
          <div style={{
            padding: '11px 14px', background: '#FEF2F2', border: '1px solid #F87171',
            color: '#991B1B', ...body, fontSize: 13, marginBottom: 18,
          }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{
              ...mono, fontSize: 10, color: LRH.mute, textTransform: 'uppercase',
              letterSpacing: '0.1em', display: 'block', marginBottom: 8,
            }}>
              Adresse Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: '1.5px solid ' + LRH.hairStrong, ...body, fontSize: 16,
                outline: 'none', transition: 'border-color 0.2s',
                color: LRH.navy, background: '#fff',
              }}
              placeholder="admin@lrh.re"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              ...mono, fontSize: 10, color: LRH.mute, textTransform: 'uppercase',
              letterSpacing: '0.1em', display: 'block', marginBottom: 8,
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: '1.5px solid ' + LRH.hairStrong, ...body, fontSize: 16,
                outline: 'none',
                color: LRH.navy, background: '#fff',
              }}
              placeholder="••••••••"
            />
          </div>

          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <TurnstileWidget onVerify={setTurnstileToken} />
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            style={{
              width: '100%', padding: '14px',
              background: !turnstileToken ? LRH.hairStrong : LRH.red,
              color: '#fff', border: 'none', borderRadius: 8,
              ...display, fontWeight: 700, fontSize: 14,
              cursor: (loading || !turnstileToken) ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <a
              href="/auth/forgot-password"
              style={{
                ...mono, fontSize: 10.5, color: LRH.mute,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              Mot de passe oublié ?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
