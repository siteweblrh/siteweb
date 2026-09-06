import 'server-only';
import { prisma } from '@/lib/prisma';
import { CACHE_TAGS, cachePublic } from '@/lib/cache/public';
import { getActiveSeasonLabel } from './season';

/**
 * Discipline « en cours » — celle que le site doit afficher par défaut.
 *
 * Le site alterne gazon et salle au fil de la saison, mais tous les écrans
 * publics démarraient en dur sur `gazon`. En pleine phase salle, le visiteur
 * arrivait donc systématiquement sur un calendrier et un classement vides, et
 * devait comprendre tout seul qu'il fallait basculer un toggle. Cette fonction
 * résout la discipline à afficher à partir des matchs réellement programmés.
 *
 * RÈGLE — le match le plus proche dans le temps gagne, à égalité c'est le match
 * à venir. Une seule règle, sans seuil arbitraire à régler :
 *
 *   - un match salle demain et le dernier gazon il y a trois mois → salle ;
 *   - saison terminée → la discipline du dernier match joué, ce qui laisse le
 *     classement final à l'écran plutôt qu'une page vide ;
 *   - aucun match du tout → `null`, et le provider retombe sur `gazon`.
 *
 * Le périmètre est la saison en cours : sans ça, un match de la saison passée
 * pourrait l'emporter sur un match à venir encore lointain.
 *
 * ⚠️ Cette fonction rend une CHAÎNE, jamais une `Date`. C'est délibéré : sa
 * version cachée passe par `unstable_cache`, qui ne préserve pas le type
 * `Date` (cf. lib/cache/public.ts). La comparaison temporelle est donc faite
 * ici, avant le cache, et jamais chez l'appelant.
 */
export async function getActiveMode(): Promise<'GAZON' | 'SALLE' | null> {
  const season = await getActiveSeasonLabel();
  const now = new Date();
  const scope = season ? { season } : {};

  const [next, previous] = await Promise.all([
    prisma.match.findFirst({
      where: {
        kickoffAt: { gte: now },
        // Un match reporté ou annulé ne dit rien de la discipline en cours.
        status: { in: ['SCHEDULED', 'LIVE', 'HALFTIME'] },
        competition: scope,
      },
      orderBy: { kickoffAt: 'asc' },
      select: { kickoffAt: true, competition: { select: { mode: true } } },
    }),
    prisma.match.findFirst({
      where: {
        kickoffAt: { lt: now },
        status: 'FINISHED',
        competition: scope,
      },
      orderBy: { kickoffAt: 'desc' },
      select: { kickoffAt: true, competition: { select: { mode: true } } },
    }),
  ]);

  if (!next) return previous?.competition.mode ?? null;
  if (!previous) return next.competition.mode;

  const toNext = next.kickoffAt.getTime() - now.getTime();
  const sincePrevious = now.getTime() - previous.kickoffAt.getTime();
  return toNext <= sincePrevious ? next.competition.mode : previous.competition.mode;
}

/**
 * Version cachée, destinée au **layout racine** — donc à 100 % des pages
 * (règle n°2).
 *
 * Coût — portée : tout le site. Fréquence : fenêtre d'1 h partagée par tous les
 * visiteurs, invalidée par le tag `competitions` que les actions sur les matchs
 * déclenchent déjà ; ajouter un match ou officialiser un score rebascule donc
 * la discipline sans attendre l'expiration. Soit de l'ordre de deux lectures
 * Neon par heure pour le site entier, pas deux par visite. Défaillance : la
 * lecture rend `null` et le provider retombe sur `gazon`, jamais un écran vide.
 */
export const getActiveModeCached = cachePublic(
  getActiveMode,
  ['mode:active'],
  [CACHE_TAGS.competitions],
);
