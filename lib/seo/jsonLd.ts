/**
 * Builders JSON-LD pour les pages publiques. Pur, sans dépendance Prisma /
 * Next — peut être appelé côté server comme côté client. Chaque builder rend
 * un objet sérialisable directement injectable via `<JsonLd data={...} />`.
 *
 * Schemas Schema.org utilisés :
 * - SportsOrganization   → page d'accueil (identité LRH)
 * - WebSite + SearchAction → page d'accueil (sitelinks search box Google)
 * - NewsArticle          → /actualites/[slug]
 * - SportsTeam           → /clubs/[slug]
 * - SportsEvent          → /match/[id] (gardé pour les partages OG même si /match
 *                          est en robots:disallow, ne nuit pas).
 */

import { SITE_URL } from '@/app/layout';

const ABSOLUTE_URL_RE = /^https?:\/\//i;
function absolute(urlOrPath: string | null | undefined): string | undefined {
  if (!urlOrPath) return undefined;
  if (ABSOLUTE_URL_RE.test(urlOrPath)) return urlOrPath;
  return `${SITE_URL}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
}

/** Identité de l'organisation — utilisée par le builder SportsOrganization
 *  et comme `publisher` des NewsArticle. */
const LRH_PUBLISHER = {
  '@type': 'Organization',
  name: 'Ligue Réunionnaise de Hockey',
  alternateName: 'LRH',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/assets/logo-complet-lrh.png`,
    width: 1200,
    height: 630,
  },
} as const;

/** Page d'accueil — entité principale du site. */
export function sportsOrganizationJsonLd(opts: {
  socials?: { instagram?: string; facebook?: string; youtube?: string; tiktok?: string };
}) {
  const sameAs = Object.values(opts.socials ?? {}).filter((u): u is string => Boolean(u && u.trim()));
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: 'Ligue Réunionnaise de Hockey',
    alternateName: 'LRH',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/logo-complet-lrh.png`,
    description:
      'Site officiel de la Ligue Réunionnaise de Hockey. Calendrier, classements, clubs et actualités du hockey sur gazon et en salle à La Réunion.',
    sport: ['Field hockey', 'Indoor hockey'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Route de la Digue, Maison des Sports',
      postalCode: '97400',
      addressLocality: 'Saint-Denis',
      addressRegion: 'La Réunion',
      addressCountry: 'FR',
    },
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'SIREN', value: '421664079' },
      { '@type': 'PropertyValue', propertyID: 'RNA', value: 'W9R1000088' },
    ],
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** WebSite avec SearchAction — permet le "sitelinks search box" Google. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ligue Réunionnaise de Hockey',
    url: SITE_URL,
    inLanguage: 'fr-FR',
    publisher: LRH_PUBLISHER,
  };
}

/** Actualité publiée. */
export function newsArticleJsonLd(opts: {
  slug: string;
  title: string;
  description: string;
  coverImage?: string | null;
  publishedAt: Date;
  updatedAt: Date;
  authorName?: string | null;
}) {
  const url = `${SITE_URL}/actualites/${opts.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: opts.title,
    description: opts.description,
    datePublished: opts.publishedAt.toISOString(),
    dateModified: opts.updatedAt.toISOString(),
    image: opts.coverImage ? [absolute(opts.coverImage)] : [`${SITE_URL}/opengraph-image`],
    author: {
      '@type': opts.authorName ? 'Person' : 'Organization',
      name: opts.authorName ?? 'Ligue Réunionnaise de Hockey',
    },
    publisher: LRH_PUBLISHER,
    inLanguage: 'fr-FR',
  };
}

/** Fiche club — utile pour les requêtes "[nom club] La Réunion". */
export function sportsTeamJsonLd(opts: {
  slug: string;
  name: string;
  city: string;
  shortCode?: string | null;
  logo?: string | null;
  foundedYear?: number | null;
  website?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: opts.name,
    url: `${SITE_URL}/clubs/${opts.slug}`,
    sport: ['Field hockey', 'Indoor hockey'],
    ...(opts.shortCode ? { alternateName: opts.shortCode } : {}),
    ...(opts.logo ? { logo: absolute(opts.logo) } : {}),
    ...(opts.foundedYear ? { foundingDate: String(opts.foundedYear) } : {}),
    location: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: opts.city,
        addressRegion: 'La Réunion',
        addressCountry: 'FR',
      },
    },
    memberOf: { '@id': `${SITE_URL}/#organization`, ...LRH_PUBLISHER },
    ...(opts.website ? { sameAs: [opts.website] } : {}),
  };
}

/** Match programmé / joué. Gardé même si /match est en robots:disallow — utile
 *  si la fiche est partagée hors recherche. */
export function sportsEventJsonLd(opts: {
  matchId: string;
  kickoffAt: Date;
  status: 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeTeam: { name: string; slug: string; shortCode?: string | null };
  awayTeam: { name: string; slug: string; shortCode?: string | null };
  homeScore?: number | null;
  awayScore?: number | null;
  competitionName: string;
  competitionSeason: string;
  venueName?: string | null;
  venueCity?: string | null;
}) {
  const url = `${SITE_URL}/match/${opts.matchId}`;
  const eventStatusMap: Record<typeof opts.status, string> = {
    SCHEDULED: 'https://schema.org/EventScheduled',
    LIVE: 'https://schema.org/EventScheduled',
    HALFTIME: 'https://schema.org/EventScheduled',
    FINISHED: 'https://schema.org/EventScheduled',
    POSTPONED: 'https://schema.org/EventPostponed',
    CANCELLED: 'https://schema.org/EventCancelled',
  };
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${opts.homeTeam.name} vs ${opts.awayTeam.name}`,
    description: `${opts.competitionName} · ${opts.competitionSeason}`,
    startDate: opts.kickoffAt.toISOString(),
    eventStatus: eventStatusMap[opts.status],
    url,
    sport: 'Field hockey',
    homeTeam: { '@type': 'SportsTeam', name: opts.homeTeam.name, url: `${SITE_URL}/clubs/${opts.homeTeam.slug}` },
    awayTeam: { '@type': 'SportsTeam', name: opts.awayTeam.name, url: `${SITE_URL}/clubs/${opts.awayTeam.slug}` },
    ...(opts.venueName
      ? {
          location: {
            '@type': 'Place',
            name: opts.venueName,
            ...(opts.venueCity
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: opts.venueCity,
                    addressRegion: 'La Réunion',
                    addressCountry: 'FR',
                  },
                }
              : {}),
          },
        }
      : {}),
    organizer: LRH_PUBLISHER,
  };
}

/** Fil d'Ariane — accepte une liste { name, url } et rend le BreadcrumbList. */
export function breadcrumbListJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absolute(it.url),
    })),
  };
}
