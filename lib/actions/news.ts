'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const NewsSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(100),
  content: z.string().min(1, "Le contenu est requis"),
  published: z.boolean().default(false),
  clubId: z.string().cuid(),
});

export async function createNews(data: z.infer<typeof NewsSchema>) {
  const session = await auth();
  if (!session) throw new Error("Non autorisé");

  const validated = NewsSchema.parse(data);

  const news = await prisma.news.create({
    data: validated,
  });

  revalidatePath("/dashboard");
  return news;
}

export async function updateNews(id: string, data: Partial<z.infer<typeof NewsSchema>>) {
  const session = await auth();
  if (!session) throw new Error("Non autorisé");

  const news = await prisma.news.update({
    where: { id },
    data,
  });

  revalidatePath("/dashboard");
  return news;
}

export async function deleteNews(id: string) {
  const session = await auth();
  if (!session) throw new Error("Non autorisé");

  await prisma.news.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
}

export async function getNews(clubId?: string) {
  return await prisma.news.findMany({
    where: clubId ? { clubId } : {},
    orderBy: { createdAt: 'desc' },
  });
}
