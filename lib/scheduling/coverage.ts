// Couverture d'une compétition sur un calendrier provisoire : est-ce que le
// nombre de créneaux configurés correspond au nombre de matchs à jouer ?
//
// Fonction pure et client-safe (aucun import Prisma) : la page charge déjà les
// créneaux, on calcule dans le navigateur plutôt que de refaire un aller-retour
// base pour des données en mémoire.
//
// C'est ce calcul qui rend le calendrier utilisable sans connaître la théorie
// des round-robins : l'admin lit un compte et corrige sa configuration.
//
// Le calcul DÉPEND DU FORMAT. C'était le défaut initial : la formule du
// round-robin était appliquée à tout, y compris aux coupes, qui annonçaient
// 6 matchs pour 4 équipes au lieu de 4.

import { expectedPairCount } from './distribute';
import { expectedCupMatchCount, firstRoundMatchCount, isBalancedBracket } from './bracket';

export type CoverageSlot = {
  plannedHomeClubId: string | null;
  plannedAwayClubId: string | null;
  isPinned: boolean;
  converted: boolean;
};

/** Ce que l'on cherche à caser sur le calendrier, selon le format. */
export type CoverageConfig =
  | {
      kind: 'round-robin';
      teamCount: number;
      doubleRound: boolean;
      /**
       * Créneaux réservés à la phase finale (3e place + finale). Ils ne sont
       * PAS remplis par le tirage : les équipes dépendent du classement.
       */
      finalsSlots?: number;
    }
  | {
      kind: 'cup';
      teamCount: number;
      includeThirdPlace: boolean;
    };

export type CoverageStatus =
  | 'no-teams'
  | 'no-slots'
  | 'unbalanced-bracket' // coupe : effectif qui n'est pas une puissance de 2
  | 'missing-slots'
  | 'extra-slots'
  | 'not-drawn'
  | 'partial'
  | 'ready';

export type Coverage = {
  status: CoverageStatus;
  /** Phrase prête à afficher, écrite pour un utilisateur non technique. */
  message: string;
  /** Action concrète à faire, ou null s'il n'y a rien à corriger. */
  hint: string | null;
  teamCount: number;
  /** Nombre total de matchs de la compétition. */
  expectedMatches: number;
  /** Ceux que le tirage peut poser dès maintenant. */
  drawableMatches: number;
  slotCount: number;
  plannedCount: number;
  convertedCount: number;
  pinnedCount: number;
  /** > 0 : créneaux manquants. < 0 : créneaux en trop. */
  slotDelta: number;
  /** Affiches programmées plus de fois que le format ne l'autorise. */
  duplicates: string[];
};

export function computeCoverage(config: CoverageConfig, slots: CoverageSlot[]): Coverage {
  const { teamCount } = config;
  const slotCount = slots.length;

  const expectedMatches =
    config.kind === 'cup'
      ? expectedCupMatchCount(teamCount, config.includeThirdPlace)
      : expectedPairCount(teamCount, config.doubleRound);

  // Une coupe ne tire que son premier tour ; un championnat à phase finale
  // laisse ses 2 derniers créneaux au classement. Même idée : une part des
  // créneaux est réservée mais non tirable.
  const drawableMatches =
    config.kind === 'cup'
      ? firstRoundMatchCount(teamCount)
      : expectedMatches;

  const reservedSlots =
    config.kind === 'cup'
      ? expectedMatches - drawableMatches
      : (config.finalsSlots ?? 0);

  const expectedSlots = drawableMatches + reservedSlots;
  const drawableSlots = slotCount - reservedSlots;

  const withPair = slots.filter((s) => s.plannedHomeClubId && s.plannedAwayClubId);
  const plannedCount = withPair.length;
  const convertedCount = slots.filter((s) => s.converted).length;
  const pinnedCount = slots.filter((s) => s.isPinned).length;
  const slotDelta = expectedSlots - slotCount;

  // Doublons : une même affiche programmée plus souvent que le format ne
  // l'autorise. En aller-retour deux occurrences sont normales.
  const seen = new Map<string, number>();
  for (const s of withPair) {
    const a = s.plannedHomeClubId!;
    const b = s.plannedAwayClubId!;
    seen.set(a < b ? `${a}|${b}` : `${b}|${a}`, (seen.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0) + 1);
  }
  const maxPerPair = config.kind === 'round-robin' && config.doubleRound ? 2 : 1;
  const duplicates = [...seen.entries()].filter(([, n]) => n > maxPerPair).map(([k]) => k);

  const base = {
    teamCount, expectedMatches, drawableMatches, slotCount,
    plannedCount, convertedCount, pinnedCount, slotDelta, duplicates,
  };

  if (teamCount < 2) {
    return {
      ...base,
      status: 'no-teams',
      message: `${teamCount} équipe${teamCount > 1 ? 's' : ''} inscrite${teamCount > 1 ? 's' : ''} — il en faut au moins 2.`,
      hint: 'Inscrivez les équipes depuis la fiche de la compétition.',
    };
  }

  if (config.kind === 'cup' && !isBalancedBracket(teamCount)) {
    return {
      ...base,
      status: 'unbalanced-bracket',
      message: `${teamCount} équipes : un tableau à élimination directe demande 2, 4, 8 ou 16 équipes.`,
      hint: 'Ajustez les inscriptions, ou prévoyez un tour préliminaire à saisir à la main.',
    };
  }

  if (slotCount === 0) {
    return {
      ...base,
      status: 'no-slots',
      message: `${expectedMatches} matchs à placer, aucun créneau configuré.`,
      hint: 'Ajoutez cette compétition au calendrier et définissez ses journées.',
    };
  }

  const reservedNote = reservedSlots > 0
    ? ` (dont ${reservedSlots} ${config.kind === 'cup' ? 'pour les tours suivants' : 'pour la phase finale'})`
    : '';
  const counts = `${expectedMatches} match${expectedMatches > 1 ? 's' : ''} à placer · ${slotCount} créneau${slotCount > 1 ? 'x' : ''} configuré${slotCount > 1 ? 's' : ''}${reservedNote}`;

  if (slotDelta > 0) {
    return {
      ...base,
      status: 'missing-slots',
      message: `${counts} — il manque ${slotDelta} créneau${slotDelta > 1 ? 'x' : ''}.`,
      hint: 'Ajoutez une journée, ou augmentez le nombre de matchs par journée.',
    };
  }

  if (slotDelta < 0) {
    const extra = -slotDelta;
    return {
      ...base,
      status: 'extra-slots',
      message: `${counts} — ${extra} créneau${extra > 1 ? 'x' : ''} vide${extra > 1 ? 's' : ''} de trop.`,
      hint: 'Retirez une journée, ou réduisez le nombre de matchs par journée.',
    };
  }

  if (duplicates.length > 0) {
    return {
      ...base,
      status: 'partial',
      message: `${counts} — ${duplicates.length} affiche${duplicates.length > 1 ? 's' : ''} programmée${duplicates.length > 1 ? 's' : ''} en double.`,
      hint: 'Relancez le tirage pour repartir sur une répartition cohérente.',
    };
  }

  if (plannedCount === 0) {
    return {
      ...base,
      status: 'not-drawn',
      message: `${counts} — le compte est juste, tirage pas encore lancé.`,
      hint: config.kind === 'cup'
        ? 'Tirez au sort le premier tour ; les tours suivants se saisiront une fois les vainqueurs connus.'
        : 'Lancez le tirage au sort.',
    };
  }

  if (plannedCount < drawableSlots) {
    return {
      ...base,
      status: 'partial',
      message: `${counts} — ${plannedCount} sur ${drawableSlots} placées.`,
      hint: 'Relancez le tirage pour compléter les créneaux vides.',
    };
  }

  return {
    ...base,
    status: 'ready',
    message: `${counts} — tout est placé${convertedCount > 0 ? `, ${convertedCount} déjà converti${convertedCount > 1 ? 's' : ''} en match` : ''}.`,
    hint: config.kind === 'cup' && reservedSlots > 0
      ? 'Les tours suivants se saisiront une fois les vainqueurs connus.'
      : null,
  };
}
