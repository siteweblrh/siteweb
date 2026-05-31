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

export function buildInviteEmail({
  loginUrl,
  email,
  password,
  clubName,
}: {
  loginUrl: string;
  email: string;
  password: string;
  clubName: string | null;
}): { subject: string; html: string; text: string } {
  const subject = clubName
    ? `Votre compte LRH pour ${clubName} est prêt`
    : 'Votre compte LRH est prêt';
  const target = clubName
    ? `gérer le club <strong>${clubName}</strong>`
    : 'accéder au dashboard administrateur';
  const targetText = clubName
    ? `gérer le club ${clubName}`
    : 'accéder au dashboard administrateur';

  const text = `Bonjour,

Un compte vous a été créé sur le site de la Ligue Réunionnaise de Hockey pour ${targetText}.

Identifiant : ${email}
Mot de passe provisoire : ${password}

Connectez-vous ici : ${loginUrl}

⚠ Pour des raisons de sécurité, il vous sera demandé de choisir un nouveau mot de passe à la première connexion.

Si vous n'attendiez pas cet email, ignorez-le simplement.

— Ligue Réunionnaise de Hockey
`;
  const html = `<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:24px;background:#F8F9FA;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0B1220">
  <table role="presentation" style="max-width:540px;margin:0 auto;background:#fff;border:1px solid rgba(10,18,32,0.08);border-top:4px solid #F3BC1C;border-collapse:collapse">
    <tr><td style="padding:28px 32px">
      <div style="font-family:ui-monospace,monospace;font-size:11px;color:#A8202F;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;margin-bottom:10px">▸ Bienvenue</div>
      <h1 style="margin:0;font-size:22px;color:#002244;font-weight:800;letter-spacing:-0.02em">Votre compte LRH est prêt.</h1>
      <p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:#1F2937">Un compte vous a été créé sur le site de la <strong>Ligue Réunionnaise de Hockey</strong> pour ${target}.</p>
      <div style="margin:22px 0;padding:18px 20px;background:#F8F9FA;border-left:3px solid #002244">
        <div style="font-family:ui-monospace,monospace;font-size:10px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:6px">Identifiant</div>
        <div style="font-family:ui-monospace,monospace;font-size:14px;color:#002244;font-weight:700;word-break:break-all">${email}</div>
        <div style="font-family:ui-monospace,monospace;font-size:10px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase;margin:14px 0 6px">Mot de passe provisoire</div>
        <div style="font-family:ui-monospace,monospace;font-size:18px;color:#A8202F;font-weight:800;letter-spacing:0.04em">${password}</div>
      </div>
      <div style="margin:22px 0">
        <a href="${loginUrl}" style="display:inline-block;background:#002244;color:#fff;padding:14px 24px;text-decoration:none;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-size:12px;font-family:ui-monospace,monospace">▸ Se connecter</a>
      </div>
      <div style="margin:24px 0 0;padding:14px 16px;background:rgba(243,188,28,0.10);border:1px solid rgba(243,188,28,0.3);font-size:12.5px;color:#1F2937;line-height:1.55">
        <strong>⚠ Important :</strong> à votre première connexion, il vous sera demandé de choisir un nouveau mot de passe.
      </div>
      <p style="margin:18px 0 0;font-size:12px;color:#6B7280;line-height:1.55">Si vous n'attendiez pas cet email, ignorez-le simplement. Aucune action n'est requise de votre part.</p>
      <div style="margin-top:24px;padding-top:18px;border-top:1px dashed rgba(10,18,32,0.14);font-family:ui-monospace,monospace;font-size:10px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase">◉ Ligue Réunionnaise de Hockey · <a href="mailto:contact@lrh.re" style="color:#002244;text-decoration:none">contact@lrh.re</a></div>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
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
