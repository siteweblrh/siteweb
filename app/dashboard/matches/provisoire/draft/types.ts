// Extrait de DraftCalendarAdmin.tsx (2200 lignes) — un fichier, une responsabilite.

export type SlotCompetition = {
  id: string;
  name: string;
  mode: string;
  category: string;
  season: string;
  format: string;
  // Présents quand la compétition est récupérée via SLOT_INCLUDE (admin).
  doubleRound?: boolean;
  fairnessEnabled?: boolean;
};

export type ConvertedMatchData = {
  id: string;
  // Nullables comme en base : un match de phase finale est créé avant que ses
  // participants soient connus. Le export type mentait jusqu'ici, et le mensonge
  // n'était pas détecté parce que la page passe les données au client via
  // JSON.parse(JSON.stringify(...)), qui renvoie `any` et court-circuite tout
  // contrôle de types à la frontière serveur/client.
  homeClubId: string | null;
  awayClubId: string | null;
  homeLabel?: string | null;
  awayLabel?: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  phase: string;
  kickoffAt: string;
};

export type DraftSlotData = {
  id: string;
  date: string;
  matchday: number;
  slotIndex: number;
  competitionId: string | null;
  competition: SlotCompetition | null;
  // Affiche planifiée par le tirage, avant conversion en match.
  plannedHomeClubId?: string | null;
  plannedAwayClubId?: string | null;
  isPinned?: boolean | null;
  label?: string | null;
  convertedMatchId?: string | null;
  convertedMatch?: ConvertedMatchData | null;
};

export type DraftCalendarCompData = {
  id: string;
  competitionId: string;
  competition: { id: string; name: string; mode: string; category: string; season: string; format: string; doubleRound?: boolean };
  startDate: string;
  endDate: string;
  slotsPerDay: number;
  color: string | null;
  dayOfWeek: string | null;
  recurrence: number | null;
};

export type DraftCalendarData = {
  id: string;
  name: string;
  season: string;
  dayOfWeek: string;
  recurrence: number;
  slotsPerDay: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  excludedDates: string[];
  addedDates: string[];
  slots: DraftSlotData[];
  competitions: DraftCalendarCompData[];
  createdAt: string;
};

export type CompetitionOption = {
  id: string;
  name: string;
  mode: string;
  season: string;
  category: string;
  format: string;
  doubleRound?: boolean;
  _count: { matches: number; standings: number; entries: number };
};

export type ClubOptionLite = {
  id: string;
  name: string;
  shortCode: string | null;
};
export type VenueOptionLite = {
  id: string;
  name: string;
  city: string | null;
};
export type RefereeOptionLite = {
  id: string;
  fullName: string;
};

export type Props = {
  calendars: DraftCalendarData[];
  competitions: CompetitionOption[];
  // Datasets nécessaires au workflow de conversion. Optionnels pour
  // rester compatibles avec l'appel historique (sans conversion).
  clubs?: ClubOptionLite[];
  venues?: VenueOptionLite[];
  referees?: RefereeOptionLite[];
  // Map clé = competitionId, valeur = set des clubId inscrits.
  entriesByCompetition?: Record<string, string[]>;
};
