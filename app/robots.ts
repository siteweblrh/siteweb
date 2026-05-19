import type { MetadataRoute } from 'next';
import { SITE_URL } from './layout';

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Exclusions :
        // - /dashboard/* : back-office (admin + clubs), pas indexable
        // - /auth/*      : login, pas indexable
        // - /api/*       : endpoints internes, jamais indexables
        // - /match/[id]  : fiches matchs (volume + faible valeur SEO unitaire)
        disallow: ['/dashboard', '/auth', '/api', '/match'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
