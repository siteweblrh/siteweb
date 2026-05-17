'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isContentKey } from "@/lib/siteContent";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Réservé aux administrateurs");
  return session;
}

function revalidateAll() {
  // Le contenu peut être consommé partout. Revalidation large mais courte
  // (ces pages ont déjà revalidate = 60).
  revalidatePath("/", "layout");
}

/**
 * Met à jour une clé. Si value est vide, supprime la rangée → le default
 * hard-codé reprend le dessus (équivalent "restaurer original").
 */
export async function setContent(key: string, value: string) {
  const session = await requireAdmin();
  if (!isContentKey(key)) {
    throw new Error(`Clé inconnue : ${key}`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    await prisma.siteContent.deleteMany({ where: { key } });
  } else {
    await prisma.siteContent.upsert({
      where: { key },
      create: { key, value, category: 'misc', updatedBy: session.user!.id },
      update: { value, updatedBy: session.user!.id },
    });
  }
  revalidateAll();
}

/**
 * Met à jour plusieurs clés en une seule transaction. Pratique pour le form
 * admin qui sauve une catégorie entière.
 */
export async function setManyContent(entries: { key: string; value: string }[]) {
  const session = await requireAdmin();
  const userId = session.user!.id;
  const ops = [];
  for (const { key, value } of entries) {
    if (!isContentKey(key)) continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      ops.push(prisma.siteContent.deleteMany({ where: { key } }));
    } else {
      ops.push(
        prisma.siteContent.upsert({
          where: { key },
          create: { key, value, category: 'misc', updatedBy: userId },
          update: { value, updatedBy: userId },
        }),
      );
    }
  }
  await prisma.$transaction(ops);
  revalidateAll();
}

/**
 * Restaure la valeur d'origine d'une clé (suppression de la rangée).
 */
export async function resetContent(key: string) {
  await requireAdmin();
  if (!isContentKey(key)) {
    throw new Error(`Clé inconnue : ${key}`);
  }
  await prisma.siteContent.deleteMany({ where: { key } });
  revalidateAll();
}

/**
 * Lecture admin : retourne toutes les rangées DB (sans appliquer les defaults).
 * Utile pour savoir lesquelles ont été surchargées.
 */
export async function listContentOverrides() {
  await requireAdmin();
  return prisma.siteContent.findMany({
    select: { key: true, value: true, updatedAt: true, updatedBy: true },
  });
}
