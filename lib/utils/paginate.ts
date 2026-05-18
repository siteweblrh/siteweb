/**
 * Helper de pagination réutilisable côté server (queries Prisma) ET côté
 * client (composant Paginator). Pas de 'use client' / 'use server' pour
 * laisser Next.js décider du contexte d'exécution.
 *
 * Donne :
 *   - currentPage : borné dans [1, totalPages]
 *   - totalPages  : ceil(total / pageSize), min 1
 *   - skip / take : à passer directement à prisma.findMany()
 */
export function paginate({
  page,
  pageSize,
  total,
}: {
  page?: number | string | null;
  pageSize: number;
  total: number;
}): { currentPage: number; totalPages: number; skip: number; take: number } {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const parsed = typeof page === 'string' ? parseInt(page, 10) : (page ?? 1);
  const current = Number.isFinite(parsed) && parsed! > 0 ? Math.min(parsed!, totalPages) : 1;
  return {
    currentPage: current,
    totalPages,
    skip: (current - 1) * pageSize,
    take: pageSize,
  };
}
