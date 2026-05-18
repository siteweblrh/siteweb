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
} = {}) {
  const where: Record<string, unknown> = {};
  if (opts.entity) where.entity = opts.entity;
  if (opts.action) where.action = opts.action;

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
