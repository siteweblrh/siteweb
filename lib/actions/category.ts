'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') throw new Error('Réservé aux administrateurs');
}

function revalidateCategories() {
  // Catégories : utilisées par /dashboard/competitions (dropdown),
  // /dashboard/club/training (saisie horaires), /clubs/[slug] et /licence.
  revalidatePath('/dashboard/competitions');
  revalidatePath('/dashboard/club/training');
  revalidatePath('/dashboard/ligue/categories');
}

const CategorySchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(64),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export type CategoryInput = z.infer<typeof CategorySchema>;

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export type CategoryRow = Awaited<ReturnType<typeof listCategories>>[number];

export async function createCategory(input: CategoryInput) {
  await requireAdmin();
  const data = CategorySchema.parse(input);
  const existing = await prisma.category.findUnique({ where: { name: data.name } });
  if (existing) throw new Error('Cette catégorie existe déjà.');
  const created = await prisma.category.create({ data });
  revalidateCategories();
  return created;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  await requireAdmin();
  const data = CategorySchema.partial().parse(input);
  if (data.name) {
    const other = await prisma.category.findUnique({ where: { name: data.name } });
    if (other && other.id !== id) throw new Error('Une autre catégorie porte déjà ce nom.');
  }
  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });
  revalidateCategories();
  return updated;
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  // Pas de FK : les Competition.category et TrainingSchedule.category restent
  // des strings autonomes. La suppression d'une catégorie n'affecte pas les
  // entités existantes — elles deviennent juste "non listées" dans le dropdown.
  await prisma.category.delete({ where: { id } });
  revalidateCategories();
}

/**
 * Initialise la table Category avec la liste suggérée (Sénior, U18, U14…).
 * Idempotent : ne touche pas aux entrées déjà présentes. Sert au seed initial
 * quand l'admin découvre la page pour la 1re fois.
 */
export async function seedDefaultCategories() {
  await requireAdmin();
  const defaults = [
    'Sénior', 'Sénior Féminines', 'Junior',
    'U18', 'U16', 'U14', 'U11', 'U9',
    'Loisir', 'Vétérans',
  ];
  const existing = await prisma.category.findMany({ select: { name: true } });
  const present = new Set(existing.map((c) => c.name));
  const toCreate = defaults
    .filter((name) => !present.has(name))
    .map((name, idx) => ({ name, sortOrder: (idx + 1) * 10 }));
  if (toCreate.length === 0) {
    revalidateCategories();
    return { created: 0 };
  }
  await prisma.category.createMany({ data: toCreate });
  revalidateCategories();
  return { created: toCreate.length };
}
