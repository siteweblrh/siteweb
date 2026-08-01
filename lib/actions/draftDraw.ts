'use server';

// Tirage au sort, ajustement du calendrier et phase finale.
//
// Séparé de draftCalendar.ts (qui gère le CRUD du calendrier et des créneaux) :
// ce sont deux sujets distincts, et les mélanger avait fait passer ce fichier
// de 1190 à 1951 lignes en une journée.
//
// Principe qui gouverne tout ce fichier : le tirage ne décide de rien, il LIT
// le calendrier. Nombre de matchs par journée, dates, aller-retour, format —
// tout vient de la configuration existante.

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  parseReunionDatetimeLocal,
  parseReunionDateAndTime,
  reunionDayKey,
} from '@/lib/utils/datetime-reunion';
import { logAudit } from '@/lib/audit';
import { generateRoundRobinPairs } from '@/lib/scheduling/roundRobin';
import { cupLayout, drawFirstRound, isBalancedBracket } from '@/lib/scheduling/bracket';
import {
  distributePairsOverDays,
  expectedPairCount,
  type DaySpec,
} from '@/lib/scheduling/distribute';
import { requireAdmin, revalidateDraft, revalidateMatch } from './draftCalendar.internals';
import { replaceCompetitionDateSlots } from './draftCalendar';

// Tirage au sort d'une compétition sur les créneaux du calendrier
// ---------------------------------------------------------------------------
//
// Principe : le tirage ne décide de rien, il LIT le calendrier. Le nombre de
// matchs par journée, les dates, l'aller-retour — tout vient de la config
// existante. On peut donc changer la config et retirer au sort à volonté.
//
// Trois niveaux de protection, dans cet ordre :
//   1. créneau converti en match réel  → intouchable
//   2. affiche épinglée par l'admin    → conservée, le tirage compose autour
//   3. le reste                        → librement redistribué

// Le bandeau de couverture est calculé CÔTÉ CLIENT à partir des slots déjà
// chargés par la page (cf. lib/scheduling/coverage.ts). Pas d'action serveur
// dédiée : ce serait un aller-retour base pour des données déjà en mémoire.

const DrawSchema = z.object({
  draftCalendarId: z.string().min(1),
  competitionId: z.string().min(1),
  /** Graine du tirage. Absente = aléatoire. Fournie = tirage reproductible. */
  seed: z.number().int().optional(),
});

/**
 * Tire au sort la compétition sur les créneaux du calendrier et enregistre le
 * résultat comme PLANIFICATION. Aucun match n'est créé ici : la conversion
 * reste un geste distinct, journée par journée.
 */
export async function drawCompetitionOnCalendar(input: z.infer<typeof DrawSchema>) {
  await requireAdmin();
  const { draftCalendarId, competitionId, seed } = DrawSchema.parse(input);

  const [competition, entries, slots] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { id: true, name: true, doubleRound: true, format: true },
    }),
    prisma.competitionEntry.findMany({
      where: { competitionId },
      select: { clubId: true },
      orderBy: { clubId: 'asc' },
    }),
    prisma.draftSlot.findMany({
      where: { draftCalendarId, competitionId },
      orderBy: [{ date: 'asc' }, { slotIndex: 'asc' }],
      select: {
        id: true, date: true, matchday: true, slotIndex: true,
        plannedHomeClubId: true, plannedAwayClubId: true,
        isPinned: true, convertedMatchId: true,
      },
    }),
  ]);

  if (!competition) throw new Error('Compétition introuvable');
  if (entries.length < 2) {
    throw new Error(
      "Il faut au moins 2 équipes inscrites à la compétition pour tirer au sort. Inscrivez-les depuis la fiche de la compétition.",
    );
  }
  if (slots.length === 0) {
    throw new Error(
      "Aucun créneau pour cette compétition dans ce calendrier. Ajoutez-la au calendrier et définissez ses journées avant de tirer au sort.",
    );
  }

  const clubIds = entries.map((e) => e.clubId);
  const isCup = competition.format === 'CUP';

  if (isCup && !isBalancedBracket(clubIds.length)) {
    throw new Error(
      `${clubIds.length} équipes : un tableau à élimination directe demande 2, 4, 8 ou 16 équipes.`,
    );
  }

  // Ce qu'il y a à poser, selon le format.
  //   championnat : toutes les affiches, APLATIES — le découpage par journée
  //                 vient des créneaux configurés, pas de la structure du
  //                 round-robin.
  //   coupe       : le PREMIER TOUR seulement. Les tours suivants dépendent
  //                 des vainqueurs ; leurs créneaux restent réservés et vides.
  const pairs = isCup
    ? drawFirstRound(clubIds, seed ?? Math.floor(Math.random() * 2 ** 31))
    : generateRoundRobinPairs(clubIds, { doubleRound: competition.doubleRound }).flat();

  const byMatchday = new Map<number, typeof slots>();
  for (const s of slots) {
    const arr = byMatchday.get(s.matchday) ?? [];
    arr.push(s);
    byMatchday.set(s.matchday, arr);
  }

  const days: DaySpec[] = [...byMatchday.entries()]
    .map(([matchday, daySlots]) => {
      const sorted = [...daySlots].sort((a, b) => a.slotIndex - b.slotIndex);
      return {
        date: reunionDayKey(sorted[0].date),
        matchday,
        slotIds: sorted.map((s) => s.id),
        // Figé = déjà converti, ou épinglé avec une affiche complète.
        fixed: sorted.map((s) => {
          const hasPair = Boolean(s.plannedHomeClubId && s.plannedAwayClubId);
          const frozen = Boolean(s.convertedMatchId) || (s.isPinned && hasPair);
          return frozen && hasPair
            ? { home: s.plannedHomeClubId!, away: s.plannedAwayClubId! }
            : null;
        }),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // Une coupe ne pose que sa première journée : les suivantes attendent les
  // vainqueurs. On ne soumet donc que cette date au répartiteur, pour ne pas
  // déclarer « vides » des créneaux qui sont légitimement en attente.
  const daysToFill = isCup ? days.slice(0, 1) : days;

  const result = distributePairsOverDays(pairs, daysToFill, {
    seed: seed ?? Math.floor(Math.random() * 2 ** 31),
  });

  // Écriture : uniquement les créneaux non figés.
  const updates = result.days.flatMap((d) =>
    d.assignments
      .filter((a) => !a.fixed)
      .map((a) =>
        prisma.draftSlot.update({
          where: { id: a.slotId },
          data: {
            plannedHomeClubId: a.pair?.home ?? null,
            plannedAwayClubId: a.pair?.away ?? null,
          },
        }),
      ),
  );
  await prisma.$transaction(updates);

  await logAudit({
    action: 'DRAW_COMPETITION_ON_CALENDAR',
    entity: 'DraftCalendar',
    entityId: draftCalendarId,
    metadata: {
      competitionId,
      competitionName: competition.name,
      teamCount: entries.length,
      pairsToPlace: pairs.length,
      slotCount: slots.length,
      unplaced: result.unplaced.length,
      emptySlots: result.emptySlots,
    },
  });

  revalidateDraft();

  return {
    placed: pairs.length - result.unplaced.length,
    unplaced: result.unplaced.length,
    emptySlots: result.emptySlots,
    warnings: result.warnings,
  };
}

/**
 * Épingle ou désépingle une affiche. Une affiche épinglée survit aux tirages
 * suivants : c'est ce qui permet de fixer un derby à une date précise et de
 * laisser l'algorithme composer autour.
 */
export async function setDraftSlotPinned(slotId: string, pinned: boolean) {
  await requireAdmin();

  const slot = await prisma.draftSlot.findUnique({
    where: { id: slotId },
    select: { plannedHomeClubId: true, plannedAwayClubId: true, convertedMatchId: true },
  });
  if (!slot) throw new Error('Créneau introuvable');
  if (slot.convertedMatchId) {
    throw new Error("Ce créneau est déjà converti en match : il est protégé, l'épinglage est inutile.");
  }
  if (pinned && !(slot.plannedHomeClubId && slot.plannedAwayClubId)) {
    throw new Error("Choisissez d'abord les deux équipes avant d'épingler l'affiche.");
  }

  await prisma.draftSlot.update({ where: { id: slotId }, data: { isPinned: pinned } });
  revalidateDraft();
}

/**
 * Met le calendrier d'accord avec la compétition : le bon nombre de journées,
 * le bon nombre de matchs par journée, et une date de phase finale si le
 * format en prévoit une.
 *
 * Existe parce que dire à l'admin « il manque 3 créneaux » ne suffit pas :
 * l'application connaît la réponse, autant qu'elle la pose.
 *
 * Refuse si un match a déjà été converti — remodeler les créneaux les
 * détruirait.
 */
export async function autoFitCalendarForCompetition(
  draftCalendarId: string,
  competitionId: string,
) {
  await requireAdmin();

  const [competition, teamCount, slots] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: competitionId },
      select: { name: true, doubleRound: true, format: true },
    }),
    prisma.competitionEntry.count({ where: { competitionId } }),
    prisma.draftSlot.findMany({
      where: { draftCalendarId, competitionId },
      select: { date: true, convertedMatchId: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  if (!competition) throw new Error('Compétition introuvable');
  if (teamCount < 2) {
    throw new Error("Inscrivez d'abord au moins 2 équipes à la compétition.");
  }
  // Une date portant au moins un match converti est intouchable : remodeler
  // ses créneaux détruirait le match. On ne réorganise donc QUE les dates
  // libres, en tenant compte de ce que les dates verrouillées couvrent déjà.
  const byDate = new Map<string, { total: number; converted: number }>();
  for (const s of slots) {
    const key = reunionDayKey(s.date);
    const cur = byDate.get(key) ?? { total: 0, converted: 0 };
    cur.total++;
    if (s.convertedMatchId) cur.converted++;
    byDate.set(key, cur);
  }
  const dates = [...byDate.keys()].sort();
  const lockedDates = dates.filter((d) => byDate.get(d)!.converted > 0);
  const freeDates = dates.filter((d) => byDate.get(d)!.converted === 0);
  const alreadyCovered = lockedDates.reduce((n, d) => n + byDate.get(d)!.total, 0);

  const isCupFormat = competition.format === 'CUP';
  if (isCupFormat && !isBalancedBracket(teamCount)) {
    throw new Error(
      `${teamCount} équipes : un tableau à élimination directe demande 2, 4, 8 ou 16 équipes.`,
    );
  }

  const pairs = isCupFormat
    ? cupLayout(teamCount, true).reduce((a, b) => a + b, 0)
    : expectedPairCount(teamCount, competition.doubleRound);
  const remaining = Math.max(0, pairs - alreadyCovered);

  // Une coupe a une structure imposée : un tour par journée, du premier tour à
  // la finale, la petite finale accompagnant la finale. Un championnat, lui,
  // répartit ses affiches à parts égales, plafonnées à N matchs par journée
  // (au plus 2 par équipe).
  const needsFinals = competition.format === 'CHAMPIONSHIP_PLAYOFFS';
  let counts: number[];
  let remainingDays: number;

  if (isCupFormat) {
    counts = cupLayout(teamCount, true);
    remainingDays = counts.length;
  } else {
    const perDayMax = teamCount;
    remainingDays = remaining > 0 ? Math.ceil(remaining / perDayMax) : 0;
    counts = remainingDays > 0 ? evenSplit(remaining, remainingDays) : [];
    if (needsFinals) counts.push(2);
  }

  if (freeDates.length < counts.length) {
    throw new Error(
      `Il faut ${counts.length} date${counts.length > 1 ? 's' : ''} libre${counts.length > 1 ? 's' : ''} (${remainingDays} journée${remainingDays > 1 ? 's' : ''} de championnat${needsFinals ? ' + 1 phase finale' : ''}), or ${freeDates.length} sont disponibles${lockedDates.length > 0 ? ` — ${lockedDates.length} déjà verrouillée${lockedDates.length > 1 ? 's' : ''} par des matchs créés` : ''}. Ajoutez des dates au calendrier puis relancez.`,
    );
  }

  // Les dates libres au-delà du nécessaire sont libérées (count = 0).
  for (let i = 0; i < freeDates.length; i++) {
    const count = i < counts.length ? counts[i] : 0;
    await replaceCompetitionDateSlots(draftCalendarId, competitionId, freeDates[i], freeDates[i], count);
  }
  const regularDays = lockedDates.length + remainingDays;

  // Libeller les créneaux réservés : l'admin doit lire la règle de
  // qualification sur le calendrier, sans avoir à s'en souvenir.
  //   championnat à phase finale : « Match 3e place » puis « Finale »
  //   coupe : dernier tour idem, tours intermédiaires nommés par leur phase
  const labelPlan = isCupFormat
    ? counts.map((_, i) => (i === counts.length - 1 ? ['Match 3e place', 'Finale'] : null))
    : counts.map((_, i) => (needsFinals && i === counts.length - 1 ? ['Match 3e place', 'Finale'] : null));

  for (let i = 0; i < counts.length && i < freeDates.length; i++) {
    const labels = labelPlan[i];
    if (!labels) continue;
    const daySlots = await prisma.draftSlot.findMany({
      where: {
        draftCalendarId, competitionId,
        date: {
          gte: parseReunionDatetimeLocal(`${freeDates[i]}T00:00`),
          lte: parseReunionDatetimeLocal(`${freeDates[i]}T23:59`),
        },
      },
      orderBy: { slotIndex: 'asc' },
      select: { id: true },
    });
    await prisma.$transaction(
      daySlots.slice(0, labels.length).map((slot, k) =>
        prisma.draftSlot.update({ where: { id: slot.id }, data: { label: labels[k] } }),
      ),
    );
  }

  // Aligner la DÉCLARATION de la compétition sur ce qu'on vient de poser.
  // Sans ça, la période dirait encore « jusqu'au 01/11, 4 matchs tous les
  // dimanches » alors que les créneaux s'arrêtent avant : la prochaine
  // régénération (ajout de date, réordonnancement, changement de période)
  // recréerait les dates libérées et écraserait le tirage.
  const usedDates = [...lockedDates, ...freeDates.slice(0, counts.length)].sort();
  const releasedDates = freeDates.slice(counts.length);
  const lastUsed = usedDates[usedDates.length - 1];

  if (lastUsed) {
    const dcc = await prisma.draftCalendarCompetition.findUnique({
      where: { draftCalendarId_competitionId: { draftCalendarId, competitionId } },
      select: { id: true, excludedDates: true },
    });
    if (dcc) {
      const alreadyExcluded = new Set(dcc.excludedDates.map((d) => reunionDayKey(d)));
      const toExclude = releasedDates.filter((d) => !alreadyExcluded.has(d));
      await prisma.draftCalendarCompetition.update({
        where: { id: dcc.id },
        data: {
          endDate: parseReunionDatetimeLocal(`${lastUsed}T23:59`),
          excludedDates: [
            ...dcc.excludedDates,
            ...toExclude.map((d) => parseReunionDatetimeLocal(`${d}T00:00`)),
          ],
        },
      });
    }
  }

  await logAudit({
    action: 'AUTOFIT_CALENDAR_COMPETITION',
    entity: 'DraftCalendar',
    entityId: draftCalendarId,
    metadata: {
      competitionId, competitionName: competition.name,
      teamCount, pairs, layout: counts, lockedDates: lockedDates.length,
      datesFreed: freeDates.length - counts.length,
    },
  });

  revalidateDraft();

  return {
    regularDays,
    perDay: counts[0] ?? 0,
    finalsDate: needsFinals,
    lockedDates: lockedDates.length,
    datesFreed: freeDates.length - counts.length,
  };
}

/** Répartit `total` en `buckets` parts aussi égales que possible. */
function evenSplit(total: number, buckets: number): number[] {
  const base = Math.floor(total / buckets);
  const rem = total % buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < rem ? 1 : 0));
}

/**
 * Libellés de qualification affichés à la place des équipes tant qu'elles ne
 * sont pas connues. Ce sont eux qui rendent le calendrier présentable aux
 * clubs avant que la compétition soit jouée.
 */
function finalsLabels(format: string): {
  final: [string, string];
  third: [string, string];
} {
  return format === 'CUP'
    ? {
        final: ['Vainqueur demi-finale 1', 'Vainqueur demi-finale 2'],
        third: ['Perdant demi-finale 1', 'Perdant demi-finale 2'],
      }
    : {
        final: ['1er du championnat', '2e du championnat'],
        third: ['3e du championnat', '4e du championnat'],
      };
}

/**
 * Crée les matchs de phase finale MAINTENANT, sans attendre les résultats.
 *
 * Les équipes ne sont pas connues, mais la date, l'horaire et le terrain le
 * sont — et c'est ce dont la ligue a besoin pour réserver les gymnases et
 * faire valider le calendrier par les clubs. Les participants sont remplacés
 * par leur règle de qualification (« Vainqueur demi-finale 1 ») jusqu'à ce que
 * `fillFinalsFromResults` les renseigne.
 */
export async function createFinalsMatches(draftCalendarId: string, competitionId: string) {
  await requireAdmin();

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, name: true, format: true },
  });
  if (!competition) throw new Error('Compétition introuvable');
  if (competition.format === 'CHAMPIONSHIP') {
    throw new Error("Cette compétition n'a pas de phase finale.");
  }

  const { finalSlot, thirdSlot } = await resolveFinalsSlots(draftCalendarId, competitionId);
  const labels = finalsLabels(competition.format);

  const plan: Array<{
    slot: { id: string; date: Date; venueId: string | null };
    pair: [string, string];
    phase: 'FINAL' | 'THIRD_PLACE';
    time: string;
  }> = [];
  if (thirdSlot) plan.push({ slot: thirdSlot, pair: labels.third, phase: 'THIRD_PLACE', time: '14:00' });
  plan.push({ slot: finalSlot, pair: labels.final, phase: 'FINAL', time: '16:00' });

  await prisma.$transaction(async (tx) => {
    for (const { slot, pair, phase, time } of plan) {
      const match = await tx.match.create({
        data: {
          competitionId,
          homeClubId: null,
          homeLabel: pair[0],
          awayClubId: null,
          awayLabel: pair[1],
          kickoffAt: parseReunionDateAndTime(reunionDayKey(slot.date), time),
          venueId: slot.venueId ?? null,
          matchday: null,
          phase,
        },
        select: { id: true },
      });
      await tx.draftSlot.update({ where: { id: slot.id }, data: { convertedMatchId: match.id } });
    }
  });

  await logAudit({
    action: 'CREATE_FINALS_MATCHES',
    entity: 'Match',
    entityId: competitionId,
    metadata: { competitionName: competition.name, format: competition.format, created: plan.length },
  });

  revalidateDraft();
  revalidateMatch();
  return { created: plan.length, hasThirdPlace: plan.length > 1 };
}

/** Créneaux de phase finale : déduits de la structure, libellés en appoint. */
async function resolveFinalsSlots(draftCalendarId: string, competitionId: string) {
  const slots = await prisma.draftSlot.findMany({
    where: { draftCalendarId, competitionId, convertedMatchId: null },
    orderBy: [{ date: 'asc' }, { slotIndex: 'asc' }],
    select: { id: true, date: true, slotIndex: true, label: true, venueId: true },
  });

  const byLabelFinal = slots.find((s) => s.label === 'Finale');
  const byLabelThird = slots.find((s) => s.label === 'Match 3e place');
  if (byLabelFinal) return { finalSlot: byLabelFinal, thirdSlot: byLabelThird };

  const lastDate = slots.reduce<string | null>((acc, s) => {
    const k = reunionDayKey(s.date);
    return acc == null || k > acc ? k : acc;
  }, null);
  const lastDaySlots = lastDate
    ? slots.filter((s) => reunionDayKey(s.date) === lastDate).sort((a, b) => a.slotIndex - b.slotIndex)
    : [];

  if (lastDaySlots.length === 0) {
    throw new Error(
      "Aucun créneau libre pour la phase finale. Lancez « Ajuster le calendrier » : il réserve la journée de phase finale.",
    );
  }
  if (lastDaySlots.length > 2) {
    throw new Error(
      `La dernière journée compte ${lastDaySlots.length} créneaux libres : une phase finale en demande 2 (finale et 3e place). Lancez « Ajuster le calendrier » pour remettre la structure d'aplomb.`,
    );
  }
  return lastDaySlots.length === 2
    ? { finalSlot: lastDaySlots[1], thirdSlot: lastDaySlots[0] }
    : { finalSlot: lastDaySlots[0], thirdSlot: undefined };
}

/**
 * Crée les matchs de phase finale sur les créneaux déjà réservés, en lisant
 * les résultats. C'est la réponse au « on ne connaît pas encore les équipes » :
 * on ne les saisit pas à l'avance, on les déduit le moment venu.
 *
 *   CHAMPIONSHIP_PLAYOFFS : finale = 1er vs 2e, 3e place = 3e vs 4e (classement)
 *   CUP                   : finale = vainqueurs du dernier tour joué,
 *                           3e place = perdants
 *
 * Refuse tant que les résultats ne permettent pas de trancher — avec la raison.
 */
export async function generateFinalsFromResults(draftCalendarId: string, competitionId: string) {
  await requireAdmin();

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, name: true, format: true },
  });
  if (!competition) throw new Error('Compétition introuvable');
  if (competition.format === 'CHAMPIONSHIP') {
    throw new Error("Cette compétition n'a pas de phase finale.");
  }

  // Créneaux réservés : ceux qui portent un libellé de phase finale et ne sont
  // pas encore convertis.
  const slots = await prisma.draftSlot.findMany({
    where: { draftCalendarId, competitionId, convertedMatchId: null },
    orderBy: [{ date: 'asc' }, { slotIndex: 'asc' }],
    select: { id: true, date: true, matchday: true, slotIndex: true, label: true, venueId: true },
  });
  // Les créneaux de phase finale se DÉDUISENT de la structure : ce sont les
  // créneaux encore libres de la dernière date de la compétition. Le libellé
  // n'est qu'un confort d'affichage — s'en servir comme critère rendait la
  // fonction inopérante sur les calendriers ajustés avant son introduction.
  let finalSlot = slots.find((s) => s.label === 'Finale');
  let thirdSlot = slots.find((s) => s.label === 'Match 3e place');

  if (!finalSlot) {
    const lastDate = slots.reduce<string | null>(
      (acc, s) => {
        const k = reunionDayKey(s.date);
        return acc == null || k > acc ? k : acc;
      },
      null,
    );
    const lastDaySlots = lastDate
      ? slots.filter((s) => reunionDayKey(s.date) === lastDate).sort((a, b) => a.slotIndex - b.slotIndex)
      : [];

    if (lastDaySlots.length === 0) {
      throw new Error(
        "Aucun créneau libre pour la phase finale. Lancez « Ajuster le calendrier » : il réserve la journée de phase finale.",
      );
    }
    if (lastDaySlots.length > 2) {
      throw new Error(
        `La dernière journée compte ${lastDaySlots.length} créneaux libres : une phase finale en demande 2 (finale et 3e place). Lancez « Ajuster le calendrier » pour remettre la structure d'aplomb.`,
      );
    }
    // Convention : la petite finale d'abord, la finale ensuite.
    if (lastDaySlots.length === 2) {
      thirdSlot = lastDaySlots[0];
      finalSlot = lastDaySlots[1];
    } else {
      finalSlot = lastDaySlots[0];
      thirdSlot = undefined;
    }
  }

  // --- déterminer les quatre équipes ---------------------------------------
  let finalPair: { home: string; away: string };
  let thirdPair: { home: string; away: string } | null = null;

  if (competition.format === 'CUP') {
    // Dernier tour joué : les matchs non-REGULAR déjà terminés.
    const played = await prisma.match.findMany({
      where: { competitionId, phase: { not: 'REGULAR' }, status: 'FINISHED' },
      orderBy: { kickoffAt: 'asc' },
      select: { homeClubId: true, awayClubId: true, homeScore: true, awayScore: true, phase: true },
    });
    const semis = played.filter((m) => m.phase === 'SEMI');
    if (semis.length < 2) {
      throw new Error(
        `Les demi-finales ne sont pas terminées (${semis.length} sur 2 avec un résultat). La finale se déduit de leurs vainqueurs.`,
      );
    }
    const winners: string[] = [];
    const losers: string[] = [];
    for (const m of semis.slice(0, 2)) {
      if (m.homeScore == null || m.awayScore == null || m.homeScore === m.awayScore) {
        throw new Error(
          "Une demi-finale est nulle ou sans score : le vainqueur ne peut pas être déduit. Saisissez les équipes à la main via « Convertir ».",
        );
      }
      if (!m.homeClubId || !m.awayClubId) {
        throw new Error(
          "Une demi-finale n-a pas ses deux equipes renseignees : le vainqueur ne peut pas etre deduit.",
        );
      }
      const homeWon = m.homeScore > m.awayScore;
      winners.push(homeWon ? m.homeClubId : m.awayClubId);
      losers.push(homeWon ? m.awayClubId : m.homeClubId);
    }
    finalPair = { home: winners[0], away: winners[1] };
    thirdPair = { home: losers[0], away: losers[1] };
  } else {
    const standings = await prisma.standing.findMany({
      where: { competitionId },
      orderBy: { rank: 'asc' },
      select: { clubId: true, rank: true },
    });
    if (standings.length < 2) {
      throw new Error("Le classement n'est pas encore établi. Renseignez les résultats de la phase régulière.");
    }
    const remaining = await prisma.match.count({
      where: { competitionId, phase: 'REGULAR', status: { not: 'FINISHED' } },
    });
    if (remaining > 0) {
      throw new Error(
        `${remaining} match${remaining > 1 ? 's' : ''} de phase régulière ${remaining > 1 ? 'ne sont' : "n'est"} pas terminé${remaining > 1 ? 's' : ''} : le classement n'est pas définitif.`,
      );
    }
    finalPair = { home: standings[0].clubId, away: standings[1].clubId };
    if (thirdSlot && standings.length >= 4) {
      thirdPair = { home: standings[2].clubId, away: standings[3].clubId };
    }
  }

  // --- renseigner les matchs -----------------------------------------------
  // Les matchs de phase finale existent déjà (créés avec leur règle de
  // qualification pour que le calendrier soit présentable). On les COMPLÈTE
  // plutôt que d'en créer de nouveaux, sinon on aurait deux finales.
  const existing = await prisma.match.findMany({
    where: { competitionId, phase: { in: ['FINAL', 'THIRD_PLACE'] } },
    select: { id: true, phase: true, homeClubId: true, awayClubId: true },
  });
  const existingFinal = existing.find((m) => m.phase === 'FINAL');
  const existingThird = existing.find((m) => m.phase === 'THIRD_PLACE');

  if (existingFinal?.homeClubId && existingFinal.awayClubId) {
    throw new Error('La finale a déjà ses deux équipes. Modifiez-la depuis sa fiche si besoin.');
  }

  let touched = 0;
  await prisma.$transaction(async (tx) => {
    if (existingFinal) {
      await tx.match.update({
        where: { id: existingFinal.id },
        data: { homeClubId: finalPair.home, awayClubId: finalPair.away, homeLabel: null, awayLabel: null },
      });
      touched++;
    } else {
      const m = await tx.match.create({
        data: {
          competitionId,
          homeClubId: finalPair.home, awayClubId: finalPair.away,
          kickoffAt: parseReunionDateAndTime(reunionDayKey(finalSlot.date), '16:00'),
          venueId: finalSlot.venueId ?? null,
          matchday: null, phase: 'FINAL',
        },
        select: { id: true },
      });
      await tx.draftSlot.update({ where: { id: finalSlot.id }, data: { convertedMatchId: m.id } });
      touched++;
    }

    if (thirdPair) {
      if (existingThird) {
        await tx.match.update({
          where: { id: existingThird.id },
          data: { homeClubId: thirdPair.home, awayClubId: thirdPair.away, homeLabel: null, awayLabel: null },
        });
        touched++;
      } else if (thirdSlot) {
        const m = await tx.match.create({
          data: {
            competitionId,
            homeClubId: thirdPair.home, awayClubId: thirdPair.away,
            kickoffAt: parseReunionDateAndTime(reunionDayKey(thirdSlot.date), '14:00'),
            venueId: thirdSlot.venueId ?? null,
            matchday: null, phase: 'THIRD_PLACE',
          },
          select: { id: true },
        });
        await tx.draftSlot.update({ where: { id: thirdSlot.id }, data: { convertedMatchId: m.id } });
        touched++;
      }
    }
  });
  const created = { length: touched };

  await logAudit({
    action: 'GENERATE_FINALS_FROM_RESULTS',
    entity: 'Match',
    entityId: competitionId,
    metadata: { competitionName: competition.name, format: competition.format, created: created.length },
  });

  revalidateDraft();
  revalidateMatch();

  return { created: created.length, hasThirdPlace: thirdPair != null };
}

/**
 * Efface la planification d'une compétition. Ne touche ni les créneaux
 * convertis ni les affiches épinglées.
 */
export async function clearCompetitionDraw(draftCalendarId: string, competitionId: string) {
  await requireAdmin();

  const { count } = await prisma.draftSlot.updateMany({
    where: { draftCalendarId, competitionId, convertedMatchId: null, isPinned: false },
    data: { plannedHomeClubId: null, plannedAwayClubId: null },
  });

  await logAudit({
    action: 'CLEAR_COMPETITION_DRAW',
    entity: 'DraftCalendar',
    entityId: draftCalendarId,
    metadata: { competitionId, clearedSlots: count },
  });

  revalidateDraft();
  return { cleared: count };
}
