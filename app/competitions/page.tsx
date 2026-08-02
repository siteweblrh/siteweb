import type { Metadata } from 'next';
import { getAllMatchesForMode, getCompetitionsForMode } from '@/lib/queries/competition';
import { getContent } from '@/lib/queries/siteContent';
import { CompetitionsPageClient } from '@/components/lrh/pages/CompetitionsPageClient';

export const metadata: Metadata = {
  title: 'Compétitions · Ligue Réunionnaise de Hockey',
  description: 'Calendrier officiel de la Ligue Réunionnaise de Hockey — tous les matchs gazon et salle, journée par journée.',
  alternates: { canonical: '/competitions' },
};

// ISR 60s : chaque modif (createMatch, updateMatch, deleteMatch, tirage,
// journée batch) appelle `revalidatePath('/competitions')` ET
// `revalidatePath('/clubs/[slug]', 'page')` (cf. revalidateMatch dans
// lib/actions/competition.ts) — la page est invalidée immédiatement après
// l'action. Le `revalidate = 60` est juste un filet de sécurité.
//
// Avant on avait `dynamic = 'force-dynamic'` par excès de prudence, ce qui
// faisait que chaque visite tapait Neon (~150-300ms de DB + render). Vu que
// les server actions invalident bien, on peut servir depuis le cache edge.
export const revalidate = 300;

export default async function CompetitionsPage() {
  const [gazonMatches, gazonCompetitions, salleMatches, salleCompetitions, heroSubtitle] =
    await Promise.all([
      getAllMatchesForMode('GAZON'),
      getCompetitionsForMode('GAZON'),
      getAllMatchesForMode('SALLE'),
      getCompetitionsForMode('SALLE'),
      getContent('hero.competitions.subtitle'),
    ]);

  // `now` capturé côté server pour le tri "présent d'abord" — évite
  // l'hydration mismatch React #418 si on calculait Date.now() côté client
  // (SSR et CSR n'auraient pas la même valeur). La page revalide toutes
  // les 60s donc la valeur reste fraîche.
  const nowMs = Date.now();

  return (
    <CompetitionsPageClient
      gazon={{ matches: gazonMatches, competitions: gazonCompetitions }}
      salle={{ matches: salleMatches, competitions: salleCompetitions }}
      heroSubtitle={heroSubtitle}
      nowMs={nowMs}
    />
  );
}
