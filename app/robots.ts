import type { MetadataRoute } from 'next';
import { SITE_URL } from './layout';

export default function robots(): MetadataRoute.Robots {
  // SITE_URL est déjà normalisé (trim + suppression du slash final) dans layout.ts.
  const base = SITE_URL;
  const privatePaths = ['/dashboard', '/auth', '/api'];
  return {
    rules: [
      {
        userAgent: ['OAI-SearchBot', 'PerplexityBot'],
        allow: '/',
        disallow: privatePaths,
      },
      {
        userAgent: '*',
        allow: '/',
        // Exclusions :
        // - /dashboard/* : back-office (admin + clubs), pas indexable
        // - /auth/*      : login, pas indexable
        // - /api/*       : endpoints internes, jamais indexables
        // Les fiches /match sont explorables afin que leur meta `noindex`
        // puisse être lue. Seuls les résultats complets sont indexables.
        disallow: privatePaths,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
