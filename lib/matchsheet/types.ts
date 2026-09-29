/**
 * Types partagés de la saisie rapide de journée (docs/SAISIE_RAPIDE_JOURNEE.md).
 *
 * Fichier NEUTRE — ni 'use server' ni 'use client', aucun import Prisma : il est
 * importé à la fois par le parseur, l'action serveur et l'écran client.
 */

export type CardKindText = 'GREEN' | 'YELLOW' | 'RED';

/* ───────────── Étape 1 : texte → structure (lib/matchsheet/parse.ts) ───────────── */

/** Personne citée sur la feuille : nom tel qu'écrit, maillot facultatif. */
export type SheetPerson = {
  name: string;
  /** Numéro porté par la feuille. N'identifie JAMAIS personne (§5.3). */
  jersey: number | null;
};

export type ParsedGoalLine = SheetPerson & {
  line: number;
  /** Équipe de la section « Buteurs <équipe> » où la ligne figure. */
  teamText: string;
  /** `null` = ligne sans nombre de buts (« n° 4 Kenny Iva ») → bloquant (§5.2). */
  count: number | null;
};

export type ParsedCard = SheetPerson & {
  line: number;
  /** Équipe de la section « Sanctions (<équipe>) », `null` si non précisée. */
  teamText: string | null;
  kind: CardKindText;
};

export type ParsedInjury = SheetPerson & {
  line: number;
  teamText: string | null;
  description: string;
};

export type ParsedMatch = {
  /** Ligne (1-indexée) du titre de la rencontre dans le texte collé. */
  line: number;
  homeText: string;
  awayText: string;
  homeScore: number;
  awayScore: number;
  goals: ParsedGoalLine[];
  /** Sections « Buteurs X (N buts) » : le total annoncé, contrôlé à part. */
  announcedTotals: { teamText: string; count: number; line: number }[];
  /** « Buteurs X : Aucun buteur » — zéro but déclaré pour ce camp. */
  noScorer: { teamText: string; line: number }[];
  cards: ParsedCard[];
  injuries: ParsedInjury[];
};

export type ParseIssue = {
  line: number;
  text: string;
  message: string;
  /** Bloquant : une ligne incomprise DANS une rencontre peut être un but perdu. */
  blocking: boolean;
};

export type ParsedSheet = {
  matches: ParsedMatch[];
  issues: ParseIssue[];
};

/* ───────────── Étape 2 : structure + base → plan (lib/actions/matchsheet.ts) ───────────── */

/** Choix de l'admin pour une personne que la base ne permet pas d'identifier seule. */
export type PersonDecision =
  | { type: 'member'; memberId: string }
  | { type: 'create'; clubId: string }
  | { type: 'free' };

/**
 * Personne à identifier : même clé pour toutes ses apparitions (buts, carton,
 * blessure) dans la journée, pour qu'un seul choix règle tous les cas.
 */
export type PersonQuestion = {
  key: string;
  name: string;
  jersey: number | null;
  /** Club pour lequel la personne joue ce jour-là (l'entente, le cas échéant). */
  teamClubId: string;
  teamClubLabel: string;
  reason: 'absent' | 'partial' | 'homonyms';
  /** Candidats en base (correspondance partielle ou homonymes). */
  candidates: { id: string; label: string }[];
  /** Clubs où la créer : le club lui-même, ou les clubs membres d'une entente. */
  createIn: { clubId: string; label: string }[];
  /** Choix déjà transmis par l'écran, s'il y en a un. */
  decision: PersonDecision | null;
};

export type PlanAlert = {
  level: 'blocking' | 'warning';
  message: string;
  line?: number;
};

export type PlannedEvent = {
  kind: 'goal' | 'card' | 'injury';
  side: 'home' | 'away';
  /** Libellé affiché : nom en base si identifié, sinon nom de la feuille. */
  who: string;
  /** Comment la personne sera enregistrée. */
  as: 'member' | 'create' | 'free' | 'unresolved';
  detail: string;
};

export type PlannedMatch = {
  line: number;
  matchId: string | null;
  title: string;
  kickoffLabel: string | null;
  score: { home: number; away: number };
  events: PlannedEvent[];
  /** Ce que l'import effacera sur ce match (§5.6). */
  existing: { goals: number; cards: number; injuries: number; score: string | null; status: string } | null;
  alerts: PlanAlert[];
};

export type MatchdayPlan = {
  competitionLabel: string;
  matchday: number;
  matches: PlannedMatch[];
  questions: PersonQuestion[];
  /** Alertes hors rencontre (lignes incomprises avant le premier titre…). */
  alerts: PlanAlert[];
  /** Matchs dont l'écrasement doit être confirmé explicitement. */
  overwriteMatchIds: string[];
  /** Vrai quand rien ne bloque : l'écriture est possible. */
  ready: boolean;
};
