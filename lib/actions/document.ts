'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  return session;
}

// CRUD réservé à l'admin ligue : ces documents sont diffusés à tous les clubs.
async function requireAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { id: true, role: true },
  });
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Réservé aux administrateurs de la ligue');
  }
  return user;
}

function revalidateDocs() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/ligue/documents');
  revalidatePath('/dashboard/club/documents');
  // Page publique /documents future — invalidée par anticipation.
  revalidatePath('/documents');
}

const UrlSchema = z
  .string()
  .min(1, 'URL requise')
  .regex(/^https?:\/\//i, 'URL doit commencer par http:// ou https://');

const DocumentSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  url: UrlSchema,
  category: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().default(false),
});

export type DocumentInput = z.infer<typeof DocumentSchema>;

export async function createDocument(input: DocumentInput) {
  const user = await requireAdmin();
  const data = DocumentSchema.parse(input);

  const created = await prisma.document.create({
    data: {
      title: data.title.trim(),
      url: data.url.trim(),
      category: data.category?.trim() || null,
      description: data.description?.trim() || null,
      isPublic: data.isPublic,
      createdById: user.id,
    },
    select: {
      id: true, title: true, url: true, category: true,
      description: true, isPublic: true, createdAt: true,
    },
  });

  await logAudit({
    action: 'CREATE_DOCUMENT',
    entity: 'Document',
    entityId: created.id,
    metadata: { title: created.title, isPublic: created.isPublic },
  });

  revalidateDocs();
  return created;
}

export async function updateDocument(id: string, input: DocumentInput) {
  await requireAdmin();
  const data = DocumentSchema.parse(input);
  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: data.title.trim(),
      url: data.url.trim(),
      category: data.category?.trim() || null,
      description: data.description?.trim() || null,
      isPublic: data.isPublic,
    },
  });
  revalidateDocs();
  return updated;
}

export async function deleteDocument(id: string) {
  await requireAdmin();
  const existing = await prisma.document.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) throw new Error('Document introuvable');

  await prisma.document.delete({ where: { id } });

  await logAudit({
    action: 'DELETE_DOCUMENT',
    entity: 'Document',
    entityId: id,
    metadata: { title: existing.title },
  });

  revalidateDocs();
}

/**
 * Liste les documents pour l'admin (CRUD complet — inclut les privés).
 * Réservée aux ADMIN.
 */
export async function listDocumentsAdmin() {
  await requireAdmin();
  return prisma.document.findMany({
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      description: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export type DocumentAdminRow = Awaited<ReturnType<typeof listDocumentsAdmin>>[number];

/**
 * Liste pour les clubs connectés : tous les documents ligue (publics ET privés).
 * Vue lecture seule — pas de création/modification/suppression côté club.
 * Auth = utilisateur connecté (admin ou manager de club).
 */
export async function listDocumentsForClub() {
  await requireAuth();
  return prisma.document.findMany({
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      description: true,
      isPublic: true,
      createdAt: true,
    },
  });
}

export type DocumentClubRow = Awaited<ReturnType<typeof listDocumentsForClub>>[number];

/** Documents publics : pas d'auth, filtre isPublic=true. Pour page /documents publique. */
export async function listPublicDocuments() {
  return prisma.document.findMany({
    where: { isPublic: true },
    orderBy: [{ category: 'asc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      url: true,
      category: true,
      description: true,
    },
  });
}

export type PublicDocument = Awaited<ReturnType<typeof listPublicDocuments>>[number];
