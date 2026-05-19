import Link from 'next/link';
import { verifyResetToken } from '@/lib/auth/password-reset';
import { LRH, display, body, mono, LrhMark } from '@/components/lrh/tokens';
import { ResetPasswordForm } from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Validation serveur du token avant même d'afficher le formulaire — évite
  // que l'utilisateur saisisse son mot de passe pour rien si le lien est mort.
  const userId = await verifyResetToken(token);

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

        {!userId ? (
          <>
            <h1
              style={{
                ...display,
                fontWeight: 800,
                fontSize: 22,
                textAlign: 'center',
                color: LRH.navy,
                marginBottom: 12,
                letterSpacing: '-0.02em',
              }}
            >
              Lien invalide ou expiré
            </h1>
            <p
              style={{
                ...body,
                fontSize: 13.5,
                color: LRH.mute,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 1.55,
              }}
            >
              Ce lien de réinitialisation n&apos;est plus valable (déjà
              utilisé, expiré, ou erroné). Demande-en un nouveau ci-dessous.
            </p>
            <Link
              href="/auth/forgot-password"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 20px',
                background: LRH.red,
                color: '#fff',
                textDecoration: 'none',
                borderRadius: 8,
                ...display,
                fontWeight: 700,
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ▸ Nouvelle demande
            </Link>
          </>
        ) : (
          <>
            <h1
              style={{
                ...display,
                fontWeight: 800,
                fontSize: 22,
                textAlign: 'center',
                color: LRH.navy,
                marginBottom: 8,
                letterSpacing: '-0.02em',
              }}
            >
              Nouveau mot de passe
            </h1>
            <p
              style={{
                ...body,
                fontSize: 13.5,
                color: LRH.mute,
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 1.55,
              }}
            >
              Choisis un nouveau mot de passe — minimum 8 caractères.
            </p>
            <ResetPasswordForm token={token} />
          </>
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
