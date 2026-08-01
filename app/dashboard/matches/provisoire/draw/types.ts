// Types partagés par le panneau de tirage. Isolés pour que chaque composant
// n'importe que ce qu'il manipule, et pour éviter les cycles d'import.

export type DrawPanelSlot = {
  id: string;
  matchday: number;
  slotIndex: number;
  date: string;
  competitionId: string | null;
  plannedHomeClubId?: string | null;
  plannedAwayClubId?: string | null;
  isPinned?: boolean | null;
  convertedMatchId?: string | null;
  /** « Finale », « Match 3e place »… posé par l'ajustement du calendrier. */
  label?: string | null;
};

export type DrawPanelClub = { id: string; name: string; shortCode: string | null };

export type DrawPanelCompetition = {
  competitionId: string;
  name: string;
  doubleRound: boolean;
  /** CHAMPIONSHIP_PLAYOFFS → une journée de plus, 2 matchs (3e place + finale). */
  hasFinals: boolean;
  /**
   * CUP → tableau à élimination directe. Le panneau ne sait pas encore le
   * tirer : il compterait les matchs avec la formule du round-robin (6 au lieu
   * de 4 pour 4 équipes) et générerait un tous-contre-tous. On bloque tant que
   * le support n'est pas écrit, plutôt que de produire un calendrier faux.
   */
  isCup: boolean;
};

/** 3e place + finale. Ces créneaux ne sont jamais remplis par le tirage. */
/** 3e place + finale : créneaux réservés, jamais remplis par le tirage. */
export const FINALS_SLOTS = 2;
