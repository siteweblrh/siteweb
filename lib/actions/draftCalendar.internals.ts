// Internes partagés par les actions du calendrier provisoire.
//
// Ce fichier n'est PAS 'use server' : une directive 'use server' interdit
// d'exporter autre chose que des fonctions async, or on partage ici un garde
// d'autorisation et des helpers d'invalidation. Les deux fichiers d'actions
// (draftCalendar.ts et draftDraw.ts) l'importent.

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') throw new Error('Réservé aux administrateurs');
  return session;
}

export function revalidateDraft() {
  // /provisoire redirige vers /calendar?mode=brouillon : c'est cette dernière
  // qui rend réellement le calendrier. Sans elle, une action réussie ne se
  // voyait pas à l'écran.
  revalidatePath('/dashboard/matches/provisoire');
  revalidatePath('/dashboard/matches/calendar');
}

export function revalidateMatch() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/matches');
  revalidatePath('/dashboard/matches/calendar');
  revalidatePath('/dashboard/standings');
  revalidatePath('/competitions');
  revalidatePath('/classements');
  revalidatePath('/');
  revalidatePath('/clubs/[slug]', 'page');
  revalidatePath('/match/[id]', 'page');
}
