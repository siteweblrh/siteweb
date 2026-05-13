'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LRH, display, body, mono, LrhMark } from '@/components/lrh/tokens';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Identifiants invalides');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: LRH.navy, padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16,
        padding: 40, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <LrhMark size={48} />
        </div>
        
        <h1 style={{
          ...display, fontWeight: 800, fontSize: 24, textAlign: 'center',
          color: LRH.navy, marginBottom: 8
        }}>
          Connexion Admin
        </h1>
        <p style={{
          ...body, fontSize: 14, color: LRH.mute, textAlign: 'center',
          marginBottom: 32
        }}>
          Accédez au portail de la LRH
        </p>

        {error && (
          <div style={{
            padding: '12px 16px', background: '#FEF2F2', border: '1px solid #F87171',
            borderRadius: 8, color: '#991B1B', ...body, fontSize: 13, marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              ...mono, fontSize: 10, color: LRH.mute, textTransform: 'uppercase',
              letterSpacing: '0.1em', display: 'block', marginBottom: 8
            }}>
              Adresse Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: '1.5px solid ' + LRH.hairStrong, ...body, fontSize: 16,
                outline: 'none', transition: 'border-color 0.2s'
              }}
              placeholder="admin@lrh.re"
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{
              ...mono, fontSize: 10, color: LRH.mute, textTransform: 'uppercase',
              letterSpacing: '0.1em', display: 'block', marginBottom: 8
            }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: '1.5px solid ' + LRH.hairStrong, ...body, fontSize: 16,
                outline: 'none'
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: LRH.red, color: '#fff',
              border: 'none', borderRadius: 8, ...display, fontWeight: 700,
              fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
