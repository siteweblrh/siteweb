'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";

const NewsCategoryEnum = z.enum(["ACTUALITE", "RESULTAT", "EVENEMENT", "COMMUNIQUE"]);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NewsCreateSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(140),
  slug: z.string().min(1).max(160).regex(slugRegex, "Slug invalide (lettres min., chiffres, tirets)"),
  excerpt: z.string().max(280).optional().nullable(),
  content: z.string().min(1, "Le contenu est requis"),
  coverImage: z.string().url().optional().nullable(),
  category: NewsCategoryEnum.default("ACTUALITE"),
  published: z.boolean().default(false),
  publishedAt: z.coerce.date().optional().nullable(),
  clubId: z.string().cuid().optional().nullable(),
});

const NewsUpdateSchema = NewsCreateSchema.partial();

export type NewsCreateInput = z.input<typeof NewsCreateSchema>;
export type NewsUpdateInput = z.input<typeof NewsUpdateSchema>;

async function ensureUniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base || "article";
  let suffix = 1;
  while (true) {
    const existing = await prisma.news.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function createNews(data: NewsCreateInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const parsed = NewsCreateSchema.parse(data);
  const slug = await ensureUniqueSlug(parsed.slug);

  const publishedAt = parsed.published
    ? (parsed.publishedAt ?? new Date())
    : null;

  const news = await prisma.news.create({
    data: {
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt ?? null,
      content: parsed.content,
      coverImage: parsed.coverImage ?? null,
      category: parsed.category,
      published: parsed.published,
      publishedAt,
      authorId: session.user.id,
      clubId: parsed.clubId ?? null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/actualites");
  return news;
}

export async function updateNews(id: string, data: NewsUpdateInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  const parsed = NewsUpdateSchema.parse(data);
  const update: Prisma.NewsUpdateInput = {};

  if (parsed.title !== undefined) update.title = parsed.title;
  if (parsed.slug !== undefined) {
    update.slug = await ensureUniqueSlug(parsed.slug, id);
  }
  if (parsed.excerpt !== undefined) update.excerpt = parsed.excerpt;
  if (parsed.content !== undefined) update.content = parsed.content;
  if (parsed.coverImage !== undefined) update.coverImage = parsed.coverImage;
  if (parsed.category !== undefined) update.category = parsed.category;
  if (parsed.clubId !== undefined) {
    update.club = parsed.clubId
      ? { connect: { id: parsed.clubId } }
      : { disconnect: true };
  }
  if (parsed.published !== undefined) {
    update.published = parsed.published;
    if (parsed.published) {
      update.publishedAt = parsed.publishedAt ?? new Date();
    } else {
      update.publishedAt = null;
    }
  } else if (parsed.publishedAt !== undefined) {
    update.publishedAt = parsed.publishedAt;
  }

  const news = await prisma.news.update({ where: { id }, data: update });

  revalidatePath("/dashboard");
  revalidatePath("/actualites");
  revalidatePath(`/actualites/${news.slug}`);
  return news;
}

export async function deleteNews(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.news.delete({ where: { id } });

  revalidatePath("/dashboard");
  revalidatePath("/actualites");
}

export async function getNews(clubId?: string) {
  return prisma.news.findMany({
    where: clubId ? { clubId } : {},
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPublishedNews(opts?: { limit?: number; category?: z.infer<typeof NewsCategoryEnum> }) {
  return prisma.news.findMany({
    where: {
      published: true,
      ...(opts?.category ? { category: opts.category } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: opts?.limit,
    include: { author: { select: { name: true, image: true } }, club: { select: { name: true, city: true } } },
  });
}

export async function getNewsBySlug(slug: string) {
  return prisma.news.findUnique({
    where: { slug },
    include: { author: { select: { name: true, image: true } }, club: { select: { name: true, city: true } } },
  });
}
