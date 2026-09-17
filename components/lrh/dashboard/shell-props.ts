/**
 * Types des props partagées par les deux coques du dashboard
 * (`HomeDashboardDesktop` et `DashboardMobile`) et par le routeur
 * `DashboardClient` qui choisit entre les deux.
 *
 * Elles recevaient toutes `: any`, ce qui laissait passer sans bruit un champ
 * renommé côté requête — le composant affichait alors `undefined`. Les types
 * décrivent ce que les coques LISENT, pas la ligne Prisma complète : les objets
 * passés en ont davantage, et TypeScript l'accepte tant qu'on passe une
 * variable (pas un littéral).
 *
 * Fichier de types purs, sans import serveur : il traverse la frontière
 * `'use client'` sans rien embarquer.
 */

export type DashboardClub = {
  id: string;
  name: string;
  city?: string | null;
};

export type DashboardUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
};

export type DashboardMetrics = {
  newsCount: number;
  membersCount: number;
  sponsorsCount: number;
  /** Alimentés uniquement pour un admin (badges de la sidebar). */
  pendingNewsCount?: number;
  pendingEngagementCount?: number;
};

export type DashboardNewsItem = {
  id: string;
  title: string;
  published: boolean;
  /** `Date` côté serveur, chaîne ISO après un aller-retour JSON. */
  createdAt: Date | string;
};

/**
 * Synthèse « accueil club » telle qu'elle arrive DANS LE CLIENT : la page la
 * sérialise en JSON (`JSON.parse(JSON.stringify(...))`), donc les `Date` sont
 * devenues des chaînes ISO. D'où `kickoffAt: string` et pas `Date`.
 */
export type ClubHomeSummaryShape = {
  nextMatch: {
    id: string;
    kickoffAt: string;
    status: string;
    matchday: number | null;
    phase: string;
    homeClub: { id: string; slug: string; shortCode: string | null; name: string } | null;
    homeLabel?: string | null;
    awayClub: { id: string; slug: string; shortCode: string | null; name: string } | null;
    awayLabel?: string | null;
    competition: { name: string; mode: string; category: string };
    venueRef: { name: string; city: string } | null;
    venue: string | null;
  } | null;
  lastMatch: {
    id: string;
    kickoffAt: string;
    homeScore: number | null;
    awayScore: number | null;
    homeClubId: string;
    awayClubId: string;
    homeClub: { id: string; slug: string; shortCode: string | null; name: string } | null;
    homeLabel?: string | null;
    awayClub: { id: string; slug: string; shortCode: string | null; name: string } | null;
    awayLabel?: string | null;
    competition: { name: string; mode: string; category: string };
  } | null;
  standings: Array<{
    rank: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
    competition: { id: string; slug: string; name: string; mode: string; season: string };
  }>;
};

/** Props communes aux deux coques. */
export type DashboardShellProps = {
  club: DashboardClub | null;
  news?: DashboardNewsItem[];
  metrics: DashboardMetrics;
  user?: DashboardUser | null;
  isAdmin?: boolean;
  summary?: ClubHomeSummaryShape | null;
};
