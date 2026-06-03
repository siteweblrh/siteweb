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
  { key: 'mixte_u10', label: 'Mixte Jeunes U10' },
  { key: 'mixte_u12', label: 'Mixte Jeunes U12' },
  { key: 'mixte_u14', label: 'Mixte Jeunes U14' },
  { key: 'mixte_u16', label: 'Mixte Jeunes U16' },
  { key: 'coupe_ligue_salle', label: 'Coupe de la Ligue Salle' },
  { key: 'coupe_reunion_gazon', label: 'Coupe de la Réunion Gazon' },
  { key: 'france_n2_salle', label: 'Championnat de France N2 Salle (si qualifié)' },
  { key: 'france_n3_gazon', label: 'Championnat de France N3 Gazon (si qualifié)' },
] as const;

export const LEISURE_ROWS = [
  { key: 'senior_7x7_gazon', label: 'Journée Séniors 7x7 Gazon' },
  { key: 'beach_hockey', label: 'Journée Beach Hockey' },
  { key: 'jeunes_plateaux', label: 'Journée Jeunes (Plateaux / Rassemblements)' },
] as const;

export const MAX_REFEREES = 8;

export type CompetitionKey = (typeof COMPETITION_ROWS)[number]['key'];
export type LeisureKey = (typeof LEISURE_ROWS)[number]['key'];

// ─── Sous-structures ───────────────────────────────────────────────────────
export type Contact = {
  name: string;
  phone: string;
  email: string;
  /** Adresse postale — utilisée uniquement pour le président. */
  address?: string;
};

export type KitColors = {
  jersey: string;
  shorts: string;
  socks: string;
};

export type EngagementRefereeRow = {
  lastName: string;
  firstName: string;
  level: string;
  phone: string;
};

export type EntryRow = {
  /** Nombre d'équipes engagées (0 = pas d'engagement). */
  count: number;
  /** Observations / commentaires libres. */
  note: string;
};

export type EngagementData = {
  // Section 1 — Informations générales
  general: {
    clubName: string;
    city: string;
    ffhAffiliation: string;
    ligueAffiliationUpToDate: boolean | null;
    entente: { active: boolean; partnerName: string };
    kit: { home: KitColors; away: KitColors };
  };
  // Section 2 — Contacts & équipe dirigeante
  contacts: {
    president: Contact;
    secretary: Contact;
    treasurer: Contact;
    seniorCompetitions: Contact;
    youthCompetitions: Contact;
    refereeManager: Contact;
  };
  // Section 3 — Infrastructures & disponibilités
  infrastructure: {
    facilityName: string;
    facilityAddress: string;
    equipment: {
      playerLockers: boolean;
      refereeLockers: boolean;
      scoreboard: boolean;
    };
    schedules: {
      seniors: { weekdays: string; saturday: string; sunday: string };
      youth: { wednesday: string; saturday: string; sunday: string };
    };
  };
  // Section 4 — Engagements compétitions officielles (keyed par CompetitionKey)
  competitions: Record<string, EntryRow>;
  // Section 5 — Loisirs / plateaux / événements (keyed par LeisureKey)
  leisure: Record<string, EntryRow>;
  // Section 6 — Liste des arbitres du club (séniors)
  referees: EngagementRefereeRow[];
};

// ─── Fabriques de valeurs par défaut ──────────────────────────────────────
function emptyContact(): Contact {
  return { name: '', phone: '', email: '', address: '' };
}
function emptyKit(): KitColors {
  return { jersey: '', shorts: '', socks: '' };
}
function emptyEntries(keys: readonly { key: string }[]): Record<string, EntryRow> {
  return Object.fromEntries(keys.map((r) => [r.key, { count: 0, note: '' }]));
}

export function emptyEngagementData(): EngagementData {
  return {
    general: {
      clubName: '',
      city: '',
      ffhAffiliation: '',
      ligueAffiliationUpToDate: null,
      entente: { active: false, partnerName: '' },
      kit: { home: emptyKit(), away: emptyKit() },
    },
    contacts: {
      president: emptyContact(),
      secretary: emptyContact(),
      treasurer: emptyContact(),
      seniorCompetitions: emptyContact(),
      youthCompetitions: emptyContact(),
      refereeManager: emptyContact(),
    },
    infrastructure: {
      facilityName: '',
      facilityAddress: '',
      equipment: { playerLockers: false, refereeLockers: false, scoreboard: false },
      schedules: {
        seniors: { weekdays: '', saturday: '', sunday: '' },
        youth: { wednesday: '', saturday: '', sunday: '' },
      },
    },
    competitions: emptyEntries(COMPETITION_ROWS),
    leisure: emptyEntries(LEISURE_ROWS),
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
  address: z.string().max(300).optional().default(''),
});

const kitSchema = z.object({
  jersey: z.string().max(60).default(''),
  shorts: z.string().max(60).default(''),
  socks: z.string().max(60).default(''),
});

const entryRowSchema = z.object({
  count: countSchema,
  note: z.string().max(280).default(''),
});

export const engagementDataSchema = z.object({
  general: z.object({
    clubName: z.string().max(200).default(''),
    city: z.string().max(120).default(''),
    ffhAffiliation: z.string().max(60).default(''),
    ligueAffiliationUpToDate: z.boolean().nullable().default(null),
    entente: z.object({
      active: z.boolean().default(false),
      partnerName: z.string().max(200).default(''),
    }),
    kit: z.object({ home: kitSchema, away: kitSchema }),
  }),
  contacts: z.object({
    president: contactSchema,
    secretary: contactSchema,
    treasurer: contactSchema,
    seniorCompetitions: contactSchema,
    youthCompetitions: contactSchema,
    refereeManager: contactSchema,
  }),
  infrastructure: z.object({
    facilityName: z.string().max(200).default(''),
    facilityAddress: z.string().max(300).default(''),
    equipment: z.object({
      playerLockers: z.boolean().default(false),
      refereeLockers: z.boolean().default(false),
      scoreboard: z.boolean().default(false),
    }),
    schedules: z.object({
      seniors: z.object({
        weekdays: z.string().max(160).default(''),
        saturday: z.string().max(160).default(''),
        sunday: z.string().max(160).default(''),
      }),
      youth: z.object({
        wednesday: z.string().max(160).default(''),
        saturday: z.string().max(160).default(''),
        sunday: z.string().max(160).default(''),
      }),
    }),
  }),
  competitions: z.record(z.string(), entryRowSchema),
  leisure: z.record(z.string(), entryRowSchema),
  referees: z
    .array(
      z.object({
        lastName: z.string().max(120).default(''),
        firstName: z.string().max(120).default(''),
        level: z.string().max(120).default(''),
        phone: z.string().max(40).default(''),
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
  if (!data.general.clubName.trim()) errs.push('Le nom officiel du club est requis.');
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
    general: { ...base.general, ...(src.general ?? {}), entente: { ...base.general.entente, ...(src.general?.entente ?? {}) }, kit: { home: { ...base.general.kit.home, ...(src.general?.kit?.home ?? {}) }, away: { ...base.general.kit.away, ...(src.general?.kit?.away ?? {}) } } },
    contacts: {
      president: { ...base.contacts.president, ...(src.contacts?.president ?? {}) },
      secretary: { ...base.contacts.secretary, ...(src.contacts?.secretary ?? {}) },
      treasurer: { ...base.contacts.treasurer, ...(src.contacts?.treasurer ?? {}) },
      seniorCompetitions: { ...base.contacts.seniorCompetitions, ...(src.contacts?.seniorCompetitions ?? {}) },
      youthCompetitions: { ...base.contacts.youthCompetitions, ...(src.contacts?.youthCompetitions ?? {}) },
      refereeManager: { ...base.contacts.refereeManager, ...(src.contacts?.refereeManager ?? {}) },
    },
    infrastructure: {
      ...base.infrastructure,
      ...(src.infrastructure ?? {}),
      equipment: { ...base.infrastructure.equipment, ...(src.infrastructure?.equipment ?? {}) },
      schedules: {
        seniors: { ...base.infrastructure.schedules.seniors, ...(src.infrastructure?.schedules?.seniors ?? {}) },
        youth: { ...base.infrastructure.schedules.youth, ...(src.infrastructure?.schedules?.youth ?? {}) },
      },
    },
    competitions: { ...base.competitions, ...(src.competitions ?? {}) },
    leisure: { ...base.leisure, ...(src.leisure ?? {}) },
    referees: Array.isArray(src.referees) ? src.referees : [],
  };
  return merged;
}
