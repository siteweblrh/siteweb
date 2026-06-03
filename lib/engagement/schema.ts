/**
 * Forme du snapshot d'une fiche d'engagement + config + validation Zod.
 *
 * Module CLIENT-SAFE : aucun import de `prisma` ni de `server-only` ici, car
 * il est consommé à la fois par le formulaire client (EngagementForm) et par
 * les actions serveur (lib/actions/engagement.ts). Les helpers de DB vivent
 * dans l'action serveur, pas ici.
 *
 * Le contenu de la colonne `ClubEngagement.data` (Json) suit le type
 * `EngagementData` ci-dessous. Les sections 1→6 du formulaire papier y sont
 * stockées telles que signées (snapshot). La section 7 (déclaration &
 * règlement) est en colonnes dédiées sur le modèle Prisma, pas dans `data`.
 *
 * Calque exact de la « FICHE ENGAGEMENT 2026-2027 » officielle de la LRH.
 */
import { z } from 'zod';

// ─── Config saison (V1 en dur ; éditable via SiteContent à l'étape 4) ──────────
export const ENGAGEMENT_SEASON = '2026-2027';
export const ENGAGEMENT_FEE_EUR = 100;
export const ENGAGEMENT_DEADLINE = '30 juin 2026';

// ─── Listes fixes (section 4 & 5) — l'ordre est celui de la fiche officielle ──
export const COMPETITION_ROWS = [
  { key: 'champ_senior_salle', label: 'Championnat Séniors Salle' },
  { key: 'champ_senior_gazon', label: 'Championnat Séniors Gazon' },
  { key: 'mixte_u12', label: 'Mixte Jeunes - de 12 ans' },
  { key: 'mixte_u14', label: 'Mixte Jeunes - de 14 ans' },
  { key: 'coupe_ligue_salle', label: 'Coupe de la Ligue Salle' },
  { key: 'coupe_ligue_gazon', label: 'Coupe de la Ligue Gazon' },
  { key: 'france_n2_salle', label: 'Championnat de France N2 Salle (si qualifié)' },
  { key: 'france_n3_gazon', label: 'Championnat de France N3 Gazon (si qualifié)' },
] as const;

export const LEISURE_ROWS = [
  { key: 'senior_7x7_gazon', label: 'Journée séniors 7x7 gazon' },
  { key: 'beach_hockey', label: 'Journée Beach hockey' },
  { key: 'jeunes_plateaux', label: 'Journée jeunes' },
] as const;

export const MAX_REFEREES = 8;
export const MAX_CLUB_ACTIONS = 6;

// Jours de la semaine pour la grille de créneaux (section 3).
export const WEEKDAYS = [
  { key: 'mon', label: 'Lundi', short: 'Lun' },
  { key: 'tue', label: 'Mardi', short: 'Mar' },
  { key: 'wed', label: 'Mercredi', short: 'Mer' },
  { key: 'thu', label: 'Jeudi', short: 'Jeu' },
  { key: 'fri', label: 'Vendredi', short: 'Ven' },
  { key: 'sat', label: 'Samedi', short: 'Sam' },
  { key: 'sun', label: 'Dimanche', short: 'Dim' },
] as const;

export type CompetitionKey = (typeof COMPETITION_ROWS)[number]['key'];
export type LeisureKey = (typeof LEISURE_ROWS)[number]['key'];
export type WeekdayKey = (typeof WEEKDAYS)[number]['key'];

// ─── Sous-structures ───────────────────────────────────────────────────────
export type Contact = {
  name: string;
  phone: string;
  email: string;
};

export type KitColors = {
  jersey: string;
  shorts: string;
  socks: string;
};

/** Une ligne de la grille hebdo (7 cellules texte = horaires libres). */
export type WeekCells = Record<WeekdayKey, string>;

/** Bloc créneaux d'une catégorie : 1 ligne match + 1 ligne entraînement. */
export type ScheduleGrid = {
  match: WeekCells;
  training: WeekCells;
};

/** Installation sportive (Salle ou Gazon). `scoreboard` seulement pour la salle. */
export type Facility = {
  name: string;
  address: string;
  playerLockers: boolean;
  refereeLockers: boolean;
  scoreboard: boolean;
};

export type EngagementRefereeRow = {
  lastName: string;
  firstName: string;
  phone: string;
  level: string; // « Formation » sur la fiche
  note: string;
};

export type ClubActionRow = {
  type: string;
  date: string;
  note: string;
};

export type EntryRow = {
  /** Nombre d'équipes engagées (0 = pas d'engagement). */
  count: number;
  /** Observations / commentaires libres. */
  note: string;
};

export type EngagementData = {
  // Section 1 — Identification du club
  general: {
    clubName: string;
    city: string;
    ffhAffiliated: boolean | null;
    ligueAffiliated: boolean | null;
    entente: { active: boolean; partnerName: string };
    /** Couleurs tenues séniors : 1ère et 2nd couleur. */
    kit: { first: KitColors; second: KitColors };
  };
  // Section 2 — Contact officiel du club
  contacts: {
    president: Contact;
    seniorCompetitions: Contact;
    youthCompetitions: Contact;
    refereeManager: Contact;
  };
  // Section 3 — Infrastructures et créneaux
  infrastructure: {
    salle: Facility;
    gazon: Facility;
    schedules: {
      seniors: ScheduleGrid;
      youth: ScheduleGrid;
    };
  };
  // Section 4 — Engagement compétitions (keyed par CompetitionKey)
  competitions: Record<string, EntryRow>;
  // Section 5 — Loisirs / événements (keyed par LeisureKey) + actions clubs
  leisure: Record<string, EntryRow>;
  clubActions: ClubActionRow[];
  // Section 6 — Engagement arbitres séniors
  referees: EngagementRefereeRow[];
};

// ─── Fabriques de valeurs par défaut ──────────────────────────────────────
function emptyContact(): Contact {
  return { name: '', phone: '', email: '' };
}
function emptyKit(): KitColors {
  return { jersey: '', shorts: '', socks: '' };
}
function emptyWeekCells(): WeekCells {
  return Object.fromEntries(WEEKDAYS.map((d) => [d.key, ''])) as WeekCells;
}
function emptyScheduleGrid(): ScheduleGrid {
  return { match: emptyWeekCells(), training: emptyWeekCells() };
}
function emptyFacility(): Facility {
  return { name: '', address: '', playerLockers: false, refereeLockers: false, scoreboard: false };
}
function emptyEntries(keys: readonly { key: string }[]): Record<string, EntryRow> {
  return Object.fromEntries(keys.map((r) => [r.key, { count: 0, note: '' }]));
}

export function emptyEngagementData(): EngagementData {
  return {
    general: {
      clubName: '',
      city: '',
      ffhAffiliated: null,
      ligueAffiliated: null,
      entente: { active: false, partnerName: '' },
      kit: { first: emptyKit(), second: emptyKit() },
    },
    contacts: {
      president: emptyContact(),
      seniorCompetitions: emptyContact(),
      youthCompetitions: emptyContact(),
      refereeManager: emptyContact(),
    },
    infrastructure: {
      salle: emptyFacility(),
      gazon: emptyFacility(),
      schedules: {
        seniors: emptyScheduleGrid(),
        youth: emptyScheduleGrid(),
      },
    },
    competitions: emptyEntries(COMPETITION_ROWS),
    leisure: emptyEntries(LEISURE_ROWS),
    clubActions: [],
    referees: [],
  };
}

/**
 * Pré-remplit les champs déjà connus à partir des données du club. Le club
 * corrige ensuite — on n'écrit jamais en retour vers Club (snapshot).
 */
export function prefillFromClub(club: { name?: string | null; city?: string | null }): EngagementData {
  const base = emptyEngagementData();
  base.general.clubName = club.name ?? '';
  base.general.city = club.city ?? '';
  return base;
}

// ─── Zod : validation lenient (sauvegarde brouillon) ──────────────────────
// On stocke même incomplet ; la validation "submit" (champs obligatoires) est
// faite dans l'action serveur via `assertSubmittable`.
// NB mémoire : z.null() AVANT z.coerce dans une union, sinon coerce transforme
// null → 0 avant que la branche null soit testée.
const countSchema = z.union([z.null(), z.coerce.number().int().min(0).max(99)]).transform((v) => v ?? 0);

const contactSchema = z.object({
  name: z.string().max(160).default(''),
  phone: z.string().max(40).default(''),
  email: z.string().max(160).default(''),
});

const kitSchema = z.object({
  jersey: z.string().max(60).default(''),
  shorts: z.string().max(60).default(''),
  socks: z.string().max(60).default(''),
});

const weekCellsSchema = z.object(
  Object.fromEntries(WEEKDAYS.map((d) => [d.key, z.string().max(80).default('')])) as Record<WeekdayKey, z.ZodDefault<z.ZodString>>,
);

const scheduleGridSchema = z.object({
  match: weekCellsSchema,
  training: weekCellsSchema,
});

const facilitySchema = z.object({
  name: z.string().max(200).default(''),
  address: z.string().max(300).default(''),
  playerLockers: z.boolean().default(false),
  refereeLockers: z.boolean().default(false),
  scoreboard: z.boolean().default(false),
});

const entryRowSchema = z.object({
  count: countSchema,
  note: z.string().max(280).default(''),
});

export const engagementDataSchema = z.object({
  general: z.object({
    clubName: z.string().max(200).default(''),
    city: z.string().max(120).default(''),
    ffhAffiliated: z.boolean().nullable().default(null),
    ligueAffiliated: z.boolean().nullable().default(null),
    entente: z.object({
      active: z.boolean().default(false),
      partnerName: z.string().max(200).default(''),
    }),
    kit: z.object({ first: kitSchema, second: kitSchema }),
  }),
  contacts: z.object({
    president: contactSchema,
    seniorCompetitions: contactSchema,
    youthCompetitions: contactSchema,
    refereeManager: contactSchema,
  }),
  infrastructure: z.object({
    salle: facilitySchema,
    gazon: facilitySchema,
    schedules: z.object({
      seniors: scheduleGridSchema,
      youth: scheduleGridSchema,
    }),
  }),
  competitions: z.record(z.string(), entryRowSchema),
  leisure: z.record(z.string(), entryRowSchema),
  clubActions: z
    .array(
      z.object({
        type: z.string().max(160).default(''),
        date: z.string().max(60).default(''),
        note: z.string().max(280).default(''),
      }),
    )
    .max(MAX_CLUB_ACTIONS)
    .default([]),
  referees: z
    .array(
      z.object({
        lastName: z.string().max(120).default(''),
        firstName: z.string().max(120).default(''),
        phone: z.string().max(40).default(''),
        level: z.string().max(120).default(''),
        note: z.string().max(280).default(''),
      }),
    )
    .max(MAX_REFEREES)
    .default([]),
});

export type EngagementDataInput = z.input<typeof engagementDataSchema>;

/**
 * Vérifie qu'une fiche est soumissible (champs minimaux obligatoires).
 * Renvoie la liste des erreurs (vide si OK). Utilisé côté serveur au submit
 * ET côté client pour désactiver le bouton + afficher les manquants.
 */
export function getSubmissionErrors(
  data: EngagementData,
  decl: { signedByName: string; signedCity: string; rgpdAccepted: boolean; declarationAccepted: boolean; paymentMethod: string | null },
): string[] {
  const errs: string[] = [];
  if (!data.general.clubName.trim()) errs.push('Le nom du club est requis.');
  if (!data.general.city.trim()) errs.push('La ville du club est requise.');
  if (!data.contacts.president.name.trim()) errs.push('Le nom du/de la président(e) est requis.');
  if (!isEmail(data.contacts.president.email)) errs.push("L'email du/de la président(e) est requis et doit être valide.");
  const totalTeams =
    Object.values(data.competitions).reduce((s, r) => s + (r.count || 0), 0) +
    Object.values(data.leisure).reduce((s, r) => s + (r.count || 0), 0);
  if (totalTeams <= 0) errs.push('Engagez au moins une équipe (compétition ou loisir).');
  if (!decl.paymentMethod) errs.push('Choisissez un mode de règlement.');
  if (!decl.signedByName.trim()) errs.push('Le nom du signataire est requis.');
  if (!decl.signedCity.trim()) errs.push('Le lieu de signature est requis.');
  if (!decl.declarationAccepted) errs.push('La déclaration sur l\'honneur doit être acceptée.');
  if (!decl.rgpdAccepted) errs.push('Le consentement RGPD est requis.');
  return errs;
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

// ─── Helpers de fusion tolérante ───────────────────────────────────────────
function mergeWeekCells(base: WeekCells, src: unknown): WeekCells {
  if (!src || typeof src !== 'object') return base;
  return { ...base, ...(src as Partial<WeekCells>) };
}
function mergeScheduleGrid(base: ScheduleGrid, src: unknown): ScheduleGrid {
  const s = (src ?? {}) as Partial<ScheduleGrid>;
  return {
    match: mergeWeekCells(base.match, s.match),
    training: mergeWeekCells(base.training, s.training),
  };
}
function mergeFacility(base: Facility, src: unknown): Facility {
  if (!src || typeof src !== 'object') return base;
  return { ...base, ...(src as Partial<Facility>) };
}

/**
 * Reconstruit un EngagementData complet à partir d'un JSON stocké (potentiellement
 * partiel ou issu d'une version antérieure du schéma). Garantit la présence de
 * toutes les clés de compétitions/loisirs. Tolérant : ne throw jamais.
 */
export function normalizeEngagementData(raw: unknown): EngagementData {
  const base = emptyEngagementData();
  if (!raw || typeof raw !== 'object') return base;
  const parsed = engagementDataSchema.safeParse(raw);
  const src = (parsed.success ? parsed.data : (raw as Partial<EngagementData>)) as Partial<EngagementData>;
  const merged: EngagementData = {
    general: {
      ...base.general,
      ...(src.general ?? {}),
      entente: { ...base.general.entente, ...(src.general?.entente ?? {}) },
      kit: {
        first: { ...base.general.kit.first, ...(src.general?.kit?.first ?? {}) },
        second: { ...base.general.kit.second, ...(src.general?.kit?.second ?? {}) },
      },
    },
    contacts: {
      president: { ...base.contacts.president, ...(src.contacts?.president ?? {}) },
      seniorCompetitions: { ...base.contacts.seniorCompetitions, ...(src.contacts?.seniorCompetitions ?? {}) },
      youthCompetitions: { ...base.contacts.youthCompetitions, ...(src.contacts?.youthCompetitions ?? {}) },
      refereeManager: { ...base.contacts.refereeManager, ...(src.contacts?.refereeManager ?? {}) },
    },
    infrastructure: {
      salle: mergeFacility(base.infrastructure.salle, src.infrastructure?.salle),
      gazon: mergeFacility(base.infrastructure.gazon, src.infrastructure?.gazon),
      schedules: {
        seniors: mergeScheduleGrid(base.infrastructure.schedules.seniors, src.infrastructure?.schedules?.seniors),
        youth: mergeScheduleGrid(base.infrastructure.schedules.youth, src.infrastructure?.schedules?.youth),
      },
    },
    competitions: { ...base.competitions, ...(src.competitions ?? {}) },
    leisure: { ...base.leisure, ...(src.leisure ?? {}) },
    clubActions: Array.isArray(src.clubActions) ? src.clubActions : [],
    referees: Array.isArray(src.referees) ? src.referees : [],
  };
  return merged;
}
