'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { CACHE_TAGS, revalidatePublic } from "@/lib/cache/public";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import { sanitizeUserHtml } from "@/lib/utils/markdown";

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

function revalidateNews() {
  revalidatePath("/dashboard");
  revalidatePath("/actualites");
  revalidatePath("/clubs/[slug]", "page");
  // Les pages d'article elles-mêmes. Seul `updateNews` les invalidait (par
  // slug) ; `approveArticle`, qui rend justement l'article public, ne le
  // faisait pas — le retard était masqué par un `revalidate` de 10 min, passé
  // à 1 h. La syntaxe ('/path/[param]', 'page') les couvre toutes d'un coup.
  revalidatePath("/actualites/[slug]", "page");
  revalidatePath("/");
  // Le sitemap est en cache 24 h (app/sitemap.ts) : sans cette ligne, un
  // article publié pouvait mettre une journée à y apparaître.
  revalidatePath("/sitemap.xml");
  // Cache de DONNÉES — distinct du cache de pages ci-dessus. `/actualites` est
  // une page dynamique : ses articles viennent de `cachePublic`, que
  // `revalidatePath` ne touche pas. Cf. lib/cache/public.ts.
  revalidatePublic(CACHE_TAGS.news);
}

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, clubId: true },
  });
  if (!user) throw new Error("Utilisateur introuvable");
  return user;
}

export async function createNews(data: NewsCreateInput) {
  const user = await getSessionUser();
  const isAdmin = user.role === 'ADMIN';

  const parsed = NewsCreateSchema.parse(data);
  const slug = await ensureUniqueSlug(parsed.slug);

  // Admin : publie directement → APPROVED. Club : brouillon → DRAFT.
  let status: 'DRAFT' | 'PENDING' | 'APPROVED' = 'DRAFT';
  let published = false;
  let publishedAt: Date | null = null;

  if (isAdmin && parsed.published) {
    status = 'APPROVED';
    published = true;
    publishedAt = parsed.publishedAt ?? new Date();
  }

  const news = await prisma.news.create({
    data: {
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt ?? null,
      content: sanitizeUserHtml(parsed.content),
      coverImage: parsed.coverImage ?? null,
      category: parsed.category,
      published,
      publishedAt,
      status,
      authorId: user.id,
      clubId: parsed.clubId ?? null,
    },
  });

  revalidateNews();
  return news;
}

export async function updateNews(id: string, data: NewsUpdateInput) {
  const user = await getSessionUser();
  const isAdmin = user.role === 'ADMIN';

  const parsed = NewsUpdateSchema.parse(data);
  const update: Prisma.NewsUpdateInput = {};

  if (parsed.title !== undefined) update.title = parsed.title;
  if (parsed.slug !== undefined) {
    update.slug = await ensureUniqueSlug(parsed.slug, id);
  }
  if (parsed.excerpt !== undefined) update.excerpt = parsed.excerpt;
  if (parsed.content !== undefined) update.content = sanitizeUserHtml(parsed.content);
  if (parsed.coverImage !== undefined) update.coverImage = parsed.coverImage;
  if (parsed.category !== undefined) update.category = parsed.category;
  if (parsed.clubId !== undefined) {
    update.club = parsed.clubId
      ? { connect: { id: parsed.clubId } }
      : { disconnect: true };
  }

  if (isAdmin) {
    if (parsed.published !== undefined) {
      update.published = parsed.published;
      if (parsed.published) {
        update.publishedAt = parsed.publishedAt ?? new Date();
        update.status = 'APPROVED';
      } else {
        update.publishedAt = null;
      }
    } else if (parsed.publishedAt !== undefined) {
      update.publishedAt = parsed.publishedAt;
    }
  }
  // Club managers ne peuvent pas toggle published directement

  const news = await prisma.news.update({ where: { id }, data: update });

  revalidateNews();
  if (news.slug) revalidatePath(`/actualites/${news.slug}`);
  return news;
}

export async function submitForReview(id: string) {
  const user = await getSessionUser();
  const article = await prisma.news.findUnique({ where: { id }, select: { authorId: true, clubId: true, status: true } });
  if (!article) throw new Error("Article introuvable");

  // Seul l'auteur ou un admin peut soumettre
  if (article.authorId !== user.id && user.role !== 'ADMIN') {
    throw new Error("Non autorisé");
  }
  if (article.status !== 'DRAFT' && article.status !== 'REJECTED') {
    throw new Error("Seul un brouillon ou un article refusé peut être soumis.");
  }

  await prisma.news.update({
    where: { id },
    data: { status: 'PENDING', rejectionReason: null },
  });

  revalidateNews();
}

export async function approveArticle(id: string) {
  const user = await getSessionUser();
  if (user.role !== 'ADMIN') throw new Error("Réservé aux administrateurs");

  await prisma.news.update({
    where: { id },
    data: { status: 'APPROVED', published: true, publishedAt: new Date(), rejectionReason: null },
  });

  revalidateNews();
}

export async function rejectArticle(id: string, reason: string) {
  const user = await getSessionUser();
  if (user.role !== 'ADMIN') throw new Error("Réservé aux administrateurs");

  if (!reason.trim()) throw new Error("Le motif de refus est requis.");

  await prisma.news.update({
    where: { id },
    data: { status: 'REJECTED', published: false, publishedAt: null, rejectionReason: reason.trim() },
  });

  revalidateNews();
}

export async function deleteNews(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");

  await prisma.news.delete({ where: { id } });
  revalidateNews();
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
      status: 'APPROVED',
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

export async function getPendingNewsCount() {
  return prisma.news.count({ where: { status: 'PENDING' } });
}
