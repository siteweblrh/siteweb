import { generateExcerpt, getReadingTimeMinutes } from "@/lib/utils/excerpt";

// Sélection partagée pour les cards news publiques (home, /actualites, page
// club). `content` n'est fetché que pour dériver excerpt + temps de lecture :
// toNewsCardItem le retire avant que la row parte dans le payload RSC —
// sinon le corps complet des articles est sérialisé dans le HTML de chaque
// page qui liste des news (~96 Ko de payload sur la home).
export const newsCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  content: true,
  coverImage: true,
  category: true,
  publishedAt: true,
  createdAt: true,
  club: { select: { name: true, city: true } },
} as const;

export function toNewsCardItem<T extends { content: string; excerpt: string | null }>(row: T) {
  const { content, ...rest } = row;
  return {
    ...rest,
    excerpt: row.excerpt ?? generateExcerpt(content, 180),
    readingTimeMinutes: getReadingTimeMinutes(content),
  };
}
