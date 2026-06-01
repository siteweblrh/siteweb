import 'server-only';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Trace une action admin sensible dans la table AuditLog.
 *
 * À appeler depuis les server actions destructives (delete*, suppressions
 * cascade) ou les mises à jour officielles (score finalisé, batch création
 * journée, désinscription d'un club, etc.).
 *
 * Best-effort : un échec d'écriture audit ne doit JAMAIS faire échouer
 * l'action métier. Toute exception est swallowed avec un console.warn.
 */
export async function logAudit(input: {
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const [session, hdrs] = await Promise.all([auth(), headers()]);
    const userId = session?.user?.id ?? null;
    const userEmail = session?.user?.email ?? null;
    const userName = session?.user?.name ?? null;

    // En production sur Vercel, le client IP est dans X-Forwarded-For
    // (premier segment). En local, fallback null.
    const xff = hdrs.get('x-forwarded-for');
    const ip = xff ? xff.split(',')[0]!.trim() : (hdrs.get('x-real-ip') ?? null);
    const userAgent = hdrs.get('user-agent');

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        userName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? null) as never,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    // Audit logging ne doit jamais bloquer l'action métier.
    console.warn('[audit] failed to log action', input.action, e);
  }
}

/** Liste paginée des entrées d'audit, du plus récent au plus ancien. */
export async function listAuditEntries(opts: {
  take?: number;
  skip?: number;
  entity?: string;
  action?: string;
  userEmail?: string;
} = {}) {
  const where: Record<string, unknown> = {};
  if (opts.entity) where.entity = opts.entity;
  if (opts.action) where.action = opts.action;
  if (opts.userEmail) where.userEmail = opts.userEmail;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
      skip: opts.skip ?? 0,
      select: {
        id: true,
        userId: true,
        userEmail: true,
        userName: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        ip: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { rows, total };
}

export type AuditEntry = Awaited<ReturnType<typeof listAuditEntries>>['rows'][number];

/**
 * Facettes pour la barre de filtres : nombre d'entrées par type d'action,
 * trié du plus fréquent au moins fréquent. Permet de n'afficher que les
 * actions réellement présentes en base (avec leur compteur).
 */
export async function getAuditActionFacets(): Promise<
  { action: string; count: number }[]
> {
  const groups = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
  });
  return groups.map((g) => ({ action: g.action, count: g._count.action }));
}

/**
 * Facettes auteurs : nombre d'entrées par auteur (identité capturée au moment
 * de l'action via userEmail), trié du plus actif au moins actif. Le nom
 * affiché privilégie userName ; les entrées sans email (auteur inconnu) sont
 * exclues car non filtrables via l'URL.
 */
export async function getAuditAuthorFacets(): Promise<
  { email: string; name: string | null; count: number }[]
> {
  // On groupe par (email, name) car un même auteur a pu changer de nom ;
  // on fusionne ensuite par email côté JS pour des compteurs cohérents.
  const groups = await prisma.auditLog.groupBy({
    by: ['userEmail', 'userName'],
    _count: { _all: true },
  });

  const byEmail = new Map<string, { email: string; name: string | null; count: number }>();
  for (const g of groups) {
    if (!g.userEmail) continue;
    const existing = byEmail.get(g.userEmail);
    if (existing) {
      existing.count += g._count._all;
      existing.name = existing.name ?? g.userName;
    } else {
      byEmail.set(g.userEmail, {
        email: g.userEmail,
        name: g.userName,
        count: g._count._all,
      });
    }
  }

  return Array.from(byEmail.values()).sort((a, b) => b.count - a.count);
}
