// Forfait d'un match — source unique du score retenu et du libellé affiché.
//
// Règlement FFH salle, Titre III art. 8 : l'équipe absente a match perdu
// 10-0. La ligue n'applique PAS le retrait de point prévu au même article
// (aligné sur le classement publié par la fédération) : le classement se
// calcule donc normalement à partir du score, rien de spécial à y faire.
//
// Client-safe : aucun import Prisma.

import { compactClubLabel } from '@/lib/utils/club-label';

export type ForfeitSide = 'HOME' | 'AWAY';

/** Buts attribués au vainqueur sur tapis vert. */
export const FORFEIT_GOALS = 10;

/** Score retenu quand `side` déclare forfait. */
export function forfeitScore(side: ForfeitSide): { homeScore: number; awayScore: number } {
  return side === 'HOME'
    ? { homeScore: 0, awayScore: FORFEIT_GOALS }
    : { homeScore: FORFEIT_GOALS, awayScore: 0 };
}

type ForfeitMatch = {
  forfeit?: ForfeitSide | null;
  homeClub?: { name: string; shortCode?: string | null } | null;
  homeLabel?: string | null;
  awayClub?: { name: string; shortCode?: string | null } | null;
  awayLabel?: string | null;
};

/** « Forfait HCP », ou null si le match a été joué. */
export function forfeitLabel(m: ForfeitMatch): string | null {
  if (!m.forfeit) return null;
  const team = m.forfeit === 'HOME'
    ? compactClubLabel(m.homeClub, m.homeLabel)
    : compactClubLabel(m.awayClub, m.awayLabel);
  return `Forfait ${team}`;
}
