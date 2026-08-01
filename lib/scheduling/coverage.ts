// Couverture d'une compétition sur un calendrier provisoire : est-ce que le
// nombre de créneaux configurés correspond au nombre d'affiches à jouer ?
//
// Fonction pure et client-safe (aucun import Prisma) : la page charge déjà les
// créneaux, on calcule dans le navigateur plutôt que de refaire un aller-retour
// base pour des données en mémoire.
//
// C'est ce calcul qui rend le calendrier utilisable sans connaître la théorie
// des round-robins : l'admin lit un compte et corrige sa configuration.

import { expectedPairCount } from './distribute';

export type CoverageSlot = {
  plannedHomeClubId: string | null;
  plannedAwayClubId: string | null;
  isPinned: boolean;
  converted: boolean;
};

export type CoverageStatus =
  | 'no-teams'      // pas assez d'équipes inscrites
  | 'no-slots'      // compétition absente du calendrier
  | 'missing-slots' // il manque des journées ou des matchs par journée
  | 'extra-slots'   // trop de créneaux pour le nombre d'affiches
  | 'not-drawn'     // compte juste, tirage pas encore lancé
  | 'partial'       // tirage partiel
  | 'ready';        // tout est placé

export type Coverage = {
  status: CoverageStatus;
  /** Phrase prête à afficher, écrite pour un utilisateur non technique. */
  message: string;
  /** Action concrète à faire, ou null s'il n'y a rien à corriger. */
  hint: string | null;
  teamCount: number;
  expectedPairs: number;
  slotCount: number;
  plannedCount: number;
  convertedCount: number;
  pinnedCount: number;
  /** > 0 : créneaux manquants. < 0 : créneaux en trop. */
  slotDelta: number;
  /** Affiches programmées plus d'une fois (clé « A|B » triée). */
  duplicates: string[];
};

export function computeCoverage(
  teamCount: number,
  doubleRound: boolean,
  slots: CoverageSlot[],
): Coverage {
  const expectedPairs = expectedPairCount(teamCount, doubleRound);
  const slotCount = slots.length;

  const withPair = slots.filter((s) => s.plannedHomeClubId && s.plannedAwayClubId);
  const plannedCount = withPair.length;
  const convertedCount = slots.filter((s) => s.converted).length;
  const pinnedCount = slots.filter((s) => s.isPinned).length;
  const slotDelta = expectedPairs - slotCount;

  // Doublons : une même affiche (sens indifférent) programmée deux fois. Sur un
  // aller-retour, deux occurrences sont normales — au-delà, c'est une erreur.
  const seen = new Map<string, number>();
  for (const s of withPair) {
    const a = s.plannedHomeClubId!;
    const b = s.plannedAwayClubId!;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const maxPerPair = doubleRound ? 2 : 1;
  const duplicates = [...seen.entries()]
    .filter(([, n]) => n > maxPerPair)
    .map(([k]) => k);

  const base = {
    teamCount, expectedPairs, slotCount, plannedCount,
    convertedCount, pinnedCount, slotDelta, duplicates,
  };

  if (teamCount < 2) {
    return {
      ...base,
      status: 'no-teams',
      message: `${teamCount} équipe${teamCount > 1 ? 's' : ''} inscrite${teamCount > 1 ? 's' : ''} — il en faut au moins 2.`,
      hint: 'Inscrivez les équipes depuis la fiche de la compétition.',
    };
  }

  if (slotCount === 0) {
    return {
      ...base,
      status: 'no-slots',
      message: `${expectedPairs} affiches à placer, aucun créneau configuré.`,
      hint: 'Ajoutez cette compétition au calendrier et définissez ses journées.',
    };
  }

  const counts = `${expectedPairs} affiche${expectedPairs > 1 ? 's' : ''} à placer · ${slotCount} créneau${slotCount > 1 ? 'x' : ''} configuré${slotCount > 1 ? 's' : ''}`;

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
      message: `${counts} — ${extra} créneau${extra > 1 ? 'x' : ''} resteront${extra > 1 ? '' : ''} vide${extra > 1 ? 's' : ''}.`,
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
      hint: 'Lancez le tirage au sort.',
    };
  }

  if (plannedCount < slotCount) {
    return {
      ...base,
      status: 'partial',
      message: `${counts} — ${plannedCount} sur ${slotCount} placées.`,
      hint: 'Relancez le tirage pour compléter les créneaux vides.',
    };
  }

  return {
    ...base,
    status: 'ready',
    message: `${counts} — tout est placé${convertedCount > 0 ? `, ${convertedCount} déjà converti${convertedCount > 1 ? 's' : ''} en match` : ''}.`,
    hint: null,
  };
}
