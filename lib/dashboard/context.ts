import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClubMetrics } from '@/lib/actions/clubs';
import { getNews } from '@/lib/actions/news';

/**
 * Contexte commun à TOUTES les pages du dashboard.
 *
 * Avant cette factorisation, chaque page faisait :
 *   1. await auth()
 *   2. await prisma.user.findUnique(...)
 *   3. await getClubMetrics(...)           // sequential
 *   4. await getNews(...)                   // sequential
 *   5. await pageSpecificData(...)          // sequential
 *
 * Soit 4-5 round-trips DB en série → ~400-800ms de latence par navigation
 * sur Neon serverless (50-150ms par query).
 *
 * Cette factorisation :
 *   - Cache le user via `React.cache()` : 1 seul lookup même si plusieurs
 *     server components l'appellent dans le même render.
 *   - Parallélise metrics + news (utilisés par la sidebar dans
 *     HomeDashboardDesktop) via Promise.all.
 *   - Renvoie tout ce qu'il faut pour brancher HomeDashboardDesktop.
 *
 * Usage type dans une page :
 *
 *   // Cas 1 (page sans branchement) : tout en 1 await
 *   const ctx = await getDashboardContext();
 *   …
 *   <HomeDashboardDesktop {...ctx.sidebarProps} activeTab="…">
 *
 *   // Cas 2 (page avec page-specific queries) : pour PARALLÉLISER vraiment,
 *   // user d'abord (cached, 1 round-trip), puis Promise.all([context, ...]).
 *   // getDashboardContext réutilise le user caché donc ne refait pas la query.
 *   const user = await getDashboardUser();
 *   if (!user) redirect('/auth/login');
 *   const [ctx, pageData] = await Promise.all([
 *     getDashboardContext(),       // metrics + news en parallèle, user caché
 *     prisma.competition.findMany(...),
 *   ]);
 *   <HomeDashboardDesktop {...ctx.sidebarProps} activeTab="…">
 *
 *   // ⚠️ Anti-pattern : `await getDashboardContext()` PUIS `Promise.all`
 *   //   séquentiel ajoute un round-trip inutile (3 au lieu de 2).
 */
export const getDashboardUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });
});

export async function getDashboardContext(options?: { requireAdmin?: boolean }) {
  const user = await getDashboardUser();
  if (!user) redirect('/auth/login');

  const isAdmin = user.role === 'ADMIN';
  if (options?.requireAdmin && !isAdmin) {
    redirect('/dashboard');
  }

  const club = user.club;

  // Parallélisé : metrics + news en simultané (utilisés par la sidebar)
  const [metrics, news] = await Promise.all([
    club ? getClubMetrics(club.id) : Promise.resolve({ newsCount: 0, membersCount: 0, sponsorsCount: 0 }),
    club ? getNews(club.id) : Promise.resolve([]),
  ]);

  return {
    user,
    club,
    isAdmin,
    metrics,
    news,
    // Props prêts à étaler dans <HomeDashboardDesktop {...sidebarProps} … />
    sidebarProps: {
      user: { id: user.id, name: user.name, email: user.email },
      club,
      isAdmin,
      metrics,
      news,
    },
  };
}

export type DashboardContext = Awaited<ReturnType<typeof getDashboardContext>>;
