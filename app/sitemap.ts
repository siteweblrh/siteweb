import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_URL } from './layout';

// Sitemap revalidé toutes les heures — frais sans tuer la DB à chaque crawl.
export const revalidate = 3600;

// Routes statiques publiques. L'ordre/priorité reflète l'importance SEO :
// les pages "vivantes" (calendrier, classements, actus) en priorité 0.9,
// le reste en 0.6-0.7.
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/',                priority: 1.0, changeFrequency: 'daily' },
  { path: '/competitions',    priority: 0.9, changeFrequency: 'daily' },
  { path: '/classements',     priority: 0.9, changeFrequency: 'daily' },
  { path: '/actualites',      priority: 0.9, changeFrequency: 'daily' },
  { path: '/clubs',           priority: 0.8, changeFrequency: 'weekly' },
  { path: '/ligue',           priority: 0.7, changeFrequency: 'monthly' },
  { path: '/arbitrage',       priority: 0.6, changeFrequency: 'monthly' },
  { path: '/licence',         priority: 0.6, changeFrequency: 'monthly' },
  { path: '/mentions-legales', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Récupérations parallèles — DB unique, latence I/O dominante.
  const [clubs, articles] = await Promise.all([
    prisma.club.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: 'asc' },
    }),
    prisma.news.findMany({
      where: { published: true },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const now = new Date();
  // SITE_URL est déjà normalisé (trim + suppression du slash final) dans layout.ts.
  const base = SITE_URL;

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const clubEntries: MetadataRoute.Sitemap = clubs.map((c) => ({
    url: `${base}/clubs/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const newsEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/actualites/${a.slug}`,
    lastModified: a.publishedAt ?? a.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticEntries, ...clubEntries, ...newsEntries];
}
