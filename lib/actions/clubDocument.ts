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

// Permissions : ADMIN OU manager rattaché au club ciblé.
async function requireClubAccess(clubId: string) {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { id: true, role: true, clubId: true },
  });
  if (!user) throw new Error('Utilisateur introuvable');
  if (user.role !== 'ADMIN' && user.clubId !== clubId) {
    throw new Error('Non autorisé à modifier les documents de ce club');
  }
  return user;
}

function revalidateDocs(clubSlug?: string | null) {
  revalidatePath('/dashboard/club/documents');
  revalidatePath('/dashboard');
  // Fiche club publique : invalider tous les slugs (on ne connaît pas
  // forcément le slug depuis l'appelant).
  revalidatePath('/clubs/[slug]', 'page');
  if (clubSlug) revalidatePath(`/clubs/${clubSlug}`);
}

// Validation : URL au format http(s) attendue. On reste permissif sur le host
// (Drive, Dropbox, OneDrive, site perso, etc.) — un check `?https?://` suffit.
const UrlSchema = z
  .string()
  .min(1, 'URL requise')
  .regex(/^https?:\/\//i, 'URL doit commencer par http:// ou https://');

const ClubDocumentSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200),
  url: UrlSchema,
  category: z.string().max(80).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().default(false),
});

export type ClubDocumentInput = z.infer<typeof ClubDocumentSchema>;

export async function createClubDocument(clubId: string, input: ClubDocumentInput) {
  const user = await requireClubAccess(clubId);
  const data = ClubDocumentSchema.parse(input);

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, slug: true, name: true },
  });
  if (!club) throw new Error('Club introuvable');

  const created = await prisma.clubDocument.create({
    data: {
      clubId,
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
    action: 'CREATE_CLUB_DOCUMENT',
    entity: 'ClubDocument',
    entityId: created.id,
    metadata: { clubId, clubName: club.name, title: created.title, isPublic: created.isPublic },
  });

  revalidateDocs(club.slug);
  return created;
}

export async function updateClubDocument(id: string, input: ClubDocumentInput) {
  const session = await requireAuth();
  // Lookup d'abord pour connaître le club, puis check permissions.
  const existing = await prisma.clubDocument.findUnique({
    where: { id },
    select: { id: true, clubId: true, club: { select: { slug: true } } },
  });
  if (!existing) throw new Error('Document introuvable');
  await requireClubAccess(existing.clubId);

  const data = ClubDocumentSchema.parse(input);
  const updated = await prisma.clubDocument.update({
    where: { id },
    data: {
      title: data.title.trim(),
      url: data.url.trim(),
      category: data.category?.trim() || null,
      description: data.description?.trim() || null,
      isPublic: data.isPublic,
    },
  });
  revalidateDocs(existing.club.slug);
  return updated;
}

export async function deleteClubDocument(id: string) {
  const existing = await prisma.clubDocument.findUnique({
    where: { id },
    select: { id: true, clubId: true, title: true, club: { select: { slug: true, name: true } } },
  });
  if (!existing) throw new Error('Document introuvable');
  await requireClubAccess(existing.clubId);

  await prisma.clubDocument.delete({ where: { id } });

  await logAudit({
    action: 'DELETE_CLUB_DOCUMENT',
    entity: 'ClubDocument',
    entityId: id,
    metadata: { clubId: existing.clubId, clubName: existing.club.name, title: existing.title },
  });

  revalidateDocs(existing.club.slug);
}

/** Liste les documents d'un club (manager du club + admin). Inclut les privés. */
export async function listClubDocuments(clubId: string) {
  await requireClubAccess(clubId);
  return prisma.clubDocument.findMany({
    where: { clubId },
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

export type ClubDocumentRow = Awaited<ReturnType<typeof listClubDocuments>>[number];

/** Liste publique : uniquement les documents isPublic=true. Pas d'auth. */
export async function listPublicClubDocuments(clubId: string) {
  return prisma.clubDocument.findMany({
    where: { clubId, isPublic: true },
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

export type PublicClubDocument = Awaited<ReturnType<typeof listPublicClubDocuments>>[number];
