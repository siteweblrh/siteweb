import 'server-only';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// Test keys Cloudflare officielles : la secret "1x..." valide automatiquement
// tous les tokens (pratique en dev avant que le user configure ses vraies clés).
// Source : https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_SECRET = '1x0000000000000000000000000000000AA';
/** Site key publique de test, idem (always passes). */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * Vérifie un token Turnstile auprès de l'API Cloudflare. Retourne true si OK.
 * - token vide → false
 * - secret non configurée → utilise la test key Cloudflare (always-pass) pour
 *   pas casser le flux en dev. En prod, configurer TURNSTILE_SECRET_KEY dans Vercel.
 * - réseau hors-service → false (fail-closed)
 */
export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY || TEST_SECRET;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return data.success === true;
  } catch {
    return false;
  }
}
