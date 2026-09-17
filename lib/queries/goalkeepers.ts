import { prisma } from '@/lib/prisma';

/**
 * Classement des gardiens d'UNE compétition.
 *
 * ## Pourquoi les buts encaissés viennent du SCORE, pas des lignes `Goal`
 *
 * Le score d'un match est l'information toujours présente : une feuille FFH
 * peut arriver sans le détail des buteurs, jamais sans le résultat. Compter les
 * lignes `Goal` sous-estimerait donc les buts encaissés dès qu'une feuille est
 * saisie partiellement — et un gardien se retrouverait en tête du classement
 * parce que SES matchs sont les moins bien renseignés. C'est l'inverse du
 * classement des buteurs, qui lui ne peut être dérivé que des `Goal`.
 *
 * ## Périmètre
 *
 * Scopé à une compétition et non à la discipline : mélanger championnat et
 * coupe dans une même moyenne comparerait des formats différents, et le filtre
 * de /classements raisonne déjà par compétition.
 *
 * Seuls les matchs `FINISHED` avec un score des deux côtés ET un gardien
 * renseigné entrent dans le calcul. Un match sans gardien saisi n'est pas
 * compté — ni pour ni contre : il est simplement absent, ce que la page dit
 * explicitement plutôt que de laisser croire à un total complet.
 *
 * Coût (règle n°2) : une seule requête, cachée par l'appelant via le tag
 * `competitions`. Défaillance : l'erreur remonte, pas de tableau vide muet.
 */
export async function getGoalkeepersForCompetition(competitionId: string) {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      homeScore: { not: null },
      awayScore: { not: null },
      competitionId,
      OR: [{ NOT: { homeGoalkeeperId: null } }, { NOT: { awayGoalkeeperId: null } }],
    },
    select: {
      homeScore: true,
      awayScore: true,
      homeGoalkeeperId: true,
      awayGoalkeeperId: true,
      homeGoalkeeper: {
        select: {
          id: true, firstName: true, lastName: true, jerseyNumber: true, photo: true,
          club: { select: { id: true, slug: true, shortCode: true, name: true } },
        },
      },
      awayGoalkeeper: {
        select: {
          id: true, firstName: true, lastName: true, jerseyNumber: true, photo: true,
          club: { select: { id: true, slug: true, shortCode: true, name: true } },
        },
      },
    },
  });

  type Keeper = NonNullable<(typeof matches)[number]['homeGoalkeeper']>;
  const tally = new Map<
    string,
    { keeper: Keeper; played: number; conceded: number; cleanSheets: number }
  >();

  const record = (keeper: Keeper | null, concededInMatch: number) => {
    if (!keeper) return;
    const entry = tally.get(keeper.id) ?? { keeper, played: 0, conceded: 0, cleanSheets: 0 };
    entry.played += 1;
    entry.conceded += concededInMatch;
    if (concededInMatch === 0) entry.cleanSheets += 1;
    tally.set(keeper.id, entry);
  };

  for (const m of matches) {
    // Le gardien du camp encaisse ce que l'ADVERSAIRE a marqué.
    record(m.homeGoalkeeper, m.awayScore ?? 0);
    record(m.awayGoalkeeper, m.homeScore ?? 0);
  }

  return [...tally.values()]
    .map((e) => ({
      ...e,
      // Moyenne arrondie au dixième — comparable entre gardiens qui n'ont pas
      // joué le même nombre de matchs, contrairement au total brut.
      average: Math.round((e.conceded / e.played) * 10) / 10,
    }))
    .sort(
      (a, b) =>
        a.average - b.average ||
        b.cleanSheets - a.cleanSheets ||
        b.played - a.played ||
        a.keeper.lastName.localeCompare(b.keeper.lastName),
    );
}

export type GoalkeeperStat = Awaited<ReturnType<typeof getGoalkeepersForCompetition>>[number];
