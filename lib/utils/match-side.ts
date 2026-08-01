// Source unique pour afficher un camp d'un match — domicile ou visiteur.
//
// Pourquoi ce module existe
// -------------------------
// Un match de phase finale se planifie AVANT que ses participants soient
// connus : la ligue doit réserver le terrain, communiquer la date aux clubs et
// faire valider le calendrier. `Match.homeClubId` et `awayClubId` sont donc
// nullables, et `homeLabel`/`awayLabel` portent alors la règle de
// qualification (« Vainqueur demi-finale 1 », « 1er du championnat »).
//
// Toute vue qui affiche une équipe passe par ici. Sans ça, chaque écran
// réinventerait son repli et l'un d'eux afficherait « undefined ».
//
// Client-safe : aucun import Prisma.

/** Ce dont on a besoin pour afficher un camp. Structurel, pas lié à Prisma. */
export type MatchSideSource = {
  club?: { name: string; shortCode?: string | null } | null;
  label?: string | null;
};

/** Repli quand ni club ni libellé ne sont renseignés — ne devrait pas arriver. */
const UNKNOWN = 'À déterminer';

/** Nom complet, ou la règle de qualification si l'équipe n'est pas connue. */
export function sideName(side: MatchSideSource): string {
  return side.club?.name ?? side.label?.trim() ?? UNKNOWN;
}

/**
 * Version courte pour les affichages contraints (mobile, calendrier, affiches).
 * Un libellé de qualification n'a pas de code court : on le rend tel quel, il
 * a été écrit pour être lisible.
 */
export function sideShortName(side: MatchSideSource): string {
  if (side.club) return side.club.shortCode || side.club.name;
  return side.label?.trim() || UNKNOWN;
}

/** L'équipe est-elle connue ? Sert à masquer logos, liens et statistiques. */
export function isSideKnown(side: MatchSideSource): boolean {
  return Boolean(side.club);
}

/**
 * Les deux camps sont-ils connus ? Un match dont ce n'est pas le cas ne pèse
 * ni sur le classement ni sur les statistiques : il n'a pas encore d'existence
 * sportive, seulement logistique.
 */
export function isMatchPlayable(m: {
  homeClubId?: string | null;
  awayClubId?: string | null;
}): boolean {
  return Boolean(m.homeClubId && m.awayClubId);
}

/** Affiche « A – B », avec les règles de qualification si besoin. */
export function matchTitle(
  m: { homeClub?: MatchSideSource['club']; homeLabel?: string | null; awayClub?: MatchSideSource['club']; awayLabel?: string | null },
  opts: { short?: boolean } = {},
): string {
  const fn = opts.short ? sideShortName : sideName;
  return `${fn({ club: m.homeClub, label: m.homeLabel })} – ${fn({ club: m.awayClub, label: m.awayLabel })}`;
}
