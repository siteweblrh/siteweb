import 'server-only';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Garde serveur : lève si l'appelant n'est pas administrateur.
 *
 * À appeler en **première ligne** de toute action mutative. Le contrôle de rôle
 * côté UI (masquer un bouton) n'est pas une sécurité : une action serveur est
 * une route HTTP appelable directement.
 *
 * Pourquoi ce fichier existe : au 2026-08-04, une fonction `requireAdmin`
 * identique était recopiée dans **10 fichiers** de `lib/actions/`. Dix copies
 * d'un contrôle de sécurité, c'est dix endroits où une correction peut être
 * oubliée. Les nouveaux fichiers d'actions utilisent celui-ci ; les dix
 * existants restent à rapatrier — chantier séparé, à faire d'un bloc pour être
 * relisible, pas au fil de l'eau.
 *
 * Ne renvoie rien volontairement : le seul usage correct est `await
 * requireAdmin()`, et un booléen inviterait à l'ignorer.
 */
export async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') throw new Error('Réservé aux administrateurs');
}
