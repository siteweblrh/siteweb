import 'server-only';
import { Resend } from 'resend';

/**
 * Wrapper Resend pour les emails transactionnels LRH.
 *
 * Configuration requise (env vars Vercel) :
 *   RESEND_API_KEY      clé API Resend (Resend dashboard → API Keys)
 *   RESEND_FROM         expéditeur — doit appartenir à un domaine vérifié
 *                       chez Resend (ex: "LRH <no-reply@lrh.re>")
 *
 * Si RESEND_API_KEY n'est pas défini, sendEmail log un warning et renvoie
 * { ok: false } — le flow reset password fonctionne en dev sans Resend.
 */

let _client: Resend | null = null;
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(process.env.RESEND_API_KEY);
  return _client;
}

const FROM = process.env.RESEND_FROM ?? 'LRH <onboarding@resend.dev>';

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) {
    console.warn(
      '[sendEmail] RESEND_API_KEY absent — email NON envoyé. Sujet:',
      subject,
      '\n→ Set RESEND_API_KEY + RESEND_FROM dans .env pour activer.',
    );
    if (process.env.NODE_ENV !== 'production') {
      // En dev, on log le contenu pour pouvoir tester sans Resend configuré.
      console.log('--- Email content (dev fallback) ---\nTo:', to, '\nSubject:', subject);
      console.log('Text:\n', text);
      console.log('---');
    }
    return { ok: false, error: 'mail-not-configured' };
  }

  try {
    const result = await client.emails.send({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error('[sendEmail] Resend error:', result.error);
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('[sendEmail] unexpected error:', err);
    return { ok: false, error: 'send-failed' };
  }
}

export function buildResetEmail({
  resetUrl,
  expiresInMinutes,
}: {
  resetUrl: string;
  expiresInMinutes: number;
}): { subject: string; html: string; text: string } {
  const subject = 'Réinitialisation de votre mot de passe LRH';
  const text = `Bonjour,

Une demande de réinitialisation de mot de passe a été émise pour votre compte sur lrh.re.

Si c'est bien vous, cliquez sur le lien suivant pour choisir un nouveau mot de passe (valable ${expiresInMinutes} minutes) :

${resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe actuel reste inchangé.

— Ligue Réunionnaise de Hockey
`;
  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F9FA;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0B1220">
  <table role="presentation" style="max-width:540px;margin:0 auto;background:#fff;border:1px solid rgba(10,18,32,0.08);border-top:4px solid #F3BC1C;border-collapse:collapse">
    <tr><td style="padding:28px 32px">
      <div style="font-family:ui-monospace,monospace;font-size:11px;color:#A8202F;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;margin-bottom:10px">▸ Réinitialisation</div>
      <h1 style="margin:0;font-size:22px;color:#002244;font-weight:800;letter-spacing:-0.02em">Choisissez un nouveau mot de passe.</h1>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:#1F2937">Une demande de réinitialisation a été émise pour votre compte sur <strong>lrh.re</strong>. Si c'est bien vous, validez la demande en cliquant sur le bouton ci-dessous (lien valide ${expiresInMinutes} minutes).</p>
      <div style="margin:24px 0">
        <a href="${resetUrl}" style="display:inline-block;background:#A8202F;color:#fff;padding:14px 24px;text-decoration:none;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:12px;font-family:ui-monospace,monospace">▸ Réinitialiser mon mot de passe</a>
      </div>
      <p style="margin:18px 0 0;font-size:12.5px;color:#6B7280;line-height:1.55">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="font-family:ui-monospace,monospace;font-size:11px;color:#002244;word-break:break-all">${resetUrl}</span></p>
      <p style="margin:24px 0 0;padding-top:18px;border-top:1px dashed rgba(10,18,32,0.14);font-size:12.5px;color:#6B7280;line-height:1.55">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. Votre mot de passe actuel reste inchangé. Pour toute question : <a href="mailto:contact@lrh.re" style="color:#002244">contact@lrh.re</a>.</p>
      <div style="margin-top:24px;font-family:ui-monospace,monospace;font-size:10px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase">◉ Ligue Réunionnaise de Hockey</div>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}
