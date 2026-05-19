import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Génération + persistance d'un token de reset password.
 *
 * Principe :
 *   1. Générer 32 bytes aléatoires (cryptographiquement sûrs) → URL-safe base64
 *   2. Hasher en SHA-256 pour stockage en DB. On NE STOCKE JAMAIS le clair.
 *   3. Renvoyer le clair UNE FOIS (utilisé dans l'URL email), le hash en DB.
 *
 * Lors du clic email, on hash à nouveau le token reçu et on cherche le row
 * par hash. Idem que pour stocker un mot de passe : la fuite DB ne donne
 * aucun moyen de réutiliser les tokens.
 *
 * Expiration : 60 minutes. Usage unique (usedAt non-null = invalidé).
 */

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

export async function createPasswordResetToken(
  userId: string,
  ip: string | null,
): Promise<string> {
  // Invalide les tokens existants pour ce user (un seul actif à la fois).
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const plain = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(plain);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt, ip },
  });

  return plain;
}

/**
 * Vérifie un token reçu et renvoie le userId associé.
 * Renvoie null si :
 *   - le token n'existe pas
 *   - le token a expiré
 *   - le token a déjà été utilisé
 *
 * Ne consomme PAS le token (l'appel à `consumeResetToken` le fait après que
 * le nouveau mot de passe a été enregistré).
 */
export async function verifyResetToken(plain: string): Promise<string | null> {
  if (!plain || plain.length < 16) return null;
  const tokenHash = hashToken(plain);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.userId;
}

/**
 * Marque le token comme utilisé. Appelé après mise à jour du mot de passe.
 */
export async function consumeResetToken(plain: string): Promise<void> {
  const tokenHash = hashToken(plain);
  await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: new Date() },
  });
}

/**
 * Garbage collection : supprime les tokens expirés ou utilisés depuis > 7
 * jours. À appeler périodiquement (cron Vercel ou route ad-hoc).
 */
export async function cleanupExpiredResetTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}
