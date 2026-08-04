import type { Metadata } from 'next';
import { getAllMatchesForMode, getCompetitionsForMode } from '@/lib/queries/competition';
import { getActiveSeasonLabel, getPublicSeasonLabels } from '@/lib/queries/season';
import { getContent } from '@/lib/queries/siteContent';
import { CompetitionsPageClient } from '@/components/lrh/pages/CompetitionsPageClient';

export const metadata: Metadata = {
  // Le nom du site est ajouté par `title.template` dans app/layout.tsx — ne
  // JAMAIS le remettre ici, sous peine de « Compétitions · Ligue Réunionnaise
  // de Hockey · Ligue Réunionnaise de Hockey » (constaté en prod le 2026-08-04).
  title: 'Compétitions',
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
//
// 300 → 3600 le 2026-08-03, même raison que la home (app/page.tsx).
export const revalidate = 3600;

// Le filtrage par saison se fait CÔTÉ CLIENT, à partir de la charge déjà
// chargée. C'est délibéré : ajouter `?season=` rendrait la page dynamique et
// remettrait chaque visite sur Neon. Or la page chargeait déjà tous les matchs
// du mode, toutes saisons confondues — filtrer côté client ne coûte donc rien
// de plus qu'aujourd'hui, et le changement de saison devient instantané.
//
// Point de vigilance pour plus tard : la charge croît d'une saison par an. Le
// jour où elle pèse, borner ici aux 2-3 saisons offertes au sélecteur.
export default async function CompetitionsPage() {
  const [
    gazonMatches, gazonCompetitions, salleMatches, salleCompetitions,
    heroSubtitle, seasons, activeSeason,
  ] = await Promise.all([
      getAllMatchesForMode('GAZON'),
      getCompetitionsForMode('GAZON'),
      getAllMatchesForMode('SALLE'),
      getCompetitionsForMode('SALLE'),
      getContent('hero.competitions.subtitle'),
      getPublicSeasonLabels(),
      getActiveSeasonLabel(),
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
      seasons={seasons}
      activeSeason={activeSeason}
    />
  );
}
