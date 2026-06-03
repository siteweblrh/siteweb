'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';
import {
  ENGAGEMENT_SEASON,
  engagementDataSchema,
  getSubmissionErrors,
  type EngagementData,
  type EngagementDataInput,
} from '@/lib/engagement/schema';
import type { EngagementPaymentMethod, EngagementStatus, EngagementPaymentStatus, Prisma } from '@prisma/client';

/**
 * Actions de la fiche d'engagement — périmètre MANAGER (étape 1).
 * Les actions admin (valider/refuser/paiement/token) arriveront aux étapes 2-3.
 *
 * Snapshot pur : aucune écriture vers Club/Referee/CompetitionEntry. Voir le
 * commentaire du modèle ClubEngagement dans schema.prisma.
 */

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, clubId: true, email: true },
  });
  if (!user) throw new Error('Utilisateur introuvable');
  return user;
}

/** Le club du manager courant doit correspondre à la fiche. Admin = bypass. */
async function assertClubAccess(clubId: string) {
  const user = await getSessionUser();
  if (user.role !== 'ADMIN' && user.clubId !== clubId) {
    throw new Error('Vous ne pouvez modifier que la fiche de votre club.');
  }
  return user;
}

export type EngagementDeclaration = {
  signedByName: string;
  signedCity: string;
  rgpdAccepted: boolean;
  declarationAccepted: boolean;
  paymentMethod: 'TRANSFER' | 'CHECK' | null;
};

/** Fiche du club courant pour la saison cible (ou null si jamais initiée). */
export async function getMyEngagement() {
  const user = await getSessionUser();
  if (!user.clubId) return null;
  return prisma.clubEngagement.findUnique({
    where: { clubId_season: { clubId: user.clubId, season: ENGAGEMENT_SEASON } },
  });
}

function parseData(input: EngagementDataInput): EngagementData {
  return engagementDataSchema.parse(input) as EngagementData;
}

/** Statuts dans lesquels le club peut encore éditer sa fiche. */
function isEditable(status: string): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}

/**
 * Crée ou met à jour le brouillon (status reste DRAFT/REJECTED). Idempotent
 * sur (clubId, season). Refusé si la fiche est déjà soumise ou validée.
 */
export async function saveEngagementDraft(clubId: string, input: EngagementDataInput) {
  await assertClubAccess(clubId);
  const data = parseData(input);

  const existing = await prisma.clubEngagement.findUnique({
    where: { clubId_season: { clubId, season: ENGAGEMENT_SEASON } },
    select: { id: true, status: true },
  });
  if (existing && !isEditable(existing.status)) {
    throw new Error('Cette fiche est déjà soumise et ne peut plus être modifiée.');
  }

  const saved = await prisma.clubEngagement.upsert({
    where: { clubId_season: { clubId, season: ENGAGEMENT_SEASON } },
    create: { clubId, season: ENGAGEMENT_SEASON, status: 'DRAFT', data: data as object },
    update: { data: data as object },
  });

  revalidatePath('/dashboard/club/engagement');
  return saved;
}

/**
 * Soumet la fiche à la ligue (DRAFT/REJECTED → SUBMITTED). Valide les champs
 * obligatoires + horodate signature et consentement RGPD.
 */
export async function submitEngagement(
  clubId: string,
  input: EngagementDataInput,
  decl: EngagementDeclaration,
) {
  const user = await assertClubAccess(clubId);
  const data = parseData(input);

  const errors = getSubmissionErrors(data, decl);
  if (errors.length > 0) {
    throw new Error('Formulaire incomplet : ' + errors.join(' '));
  }

  const existing = await prisma.clubEngagement.findUnique({
    where: { clubId_season: { clubId, season: ENGAGEMENT_SEASON } },
    select: { id: true, status: true },
  });
  if (existing && !isEditable(existing.status)) {
    throw new Error('Cette fiche est déjà soumise.');
  }

  const now = new Date();
  const payload = {
    status: 'SUBMITTED' as const,
    data: data as object,
    signedByName: decl.signedByName.trim(),
    signedCity: decl.signedCity.trim(),
    signedAt: now,
    rgpdAcceptedAt: now,
    paymentMethod: decl.paymentMethod as EngagementPaymentMethod,
    submittedAt: now,
    submittedByEmail: user.email ?? null,
    rejectedReason: null,
  };

  const saved = await prisma.clubEngagement.upsert({
    where: { clubId_season: { clubId, season: ENGAGEMENT_SEASON } },
    create: { clubId, season: ENGAGEMENT_SEASON, ...payload },
    update: payload,
  });

  await logAudit({
    action: 'SUBMIT_ENGAGEMENT',
    entity: 'ClubEngagement',
    entityId: saved.id,
    metadata: { clubId, season: ENGAGEMENT_SEASON, club: data.general.clubName },
  });

  revalidatePath('/dashboard/club/engagement');
  revalidatePath('/dashboard/ligue/engagements');
  return saved;
}

// ─────────────────────────────────────────────────────────────────────────────
// PÉRIMÈTRE ADMIN — validation, refus, statut paiement, liste
// ─────────────────────────────────────────────────────────────────────────────

async function assertAdmin() {
  const user = await getSessionUser();
  if (user.role !== 'ADMIN') throw new Error('Réservé aux administrateurs.');
  return user;
}

export type EngagementListFilters = {
  season?: string;
  status?: EngagementStatus;
  payment?: EngagementPaymentStatus;
};

/** Liste admin filtrable. Les brouillons jamais soumis sont exclus (rien à traiter). */
export async function listEngagements(filters: EngagementListFilters = {}) {
  await assertAdmin();
  const where: Prisma.ClubEngagementWhereInput = {
    // On ne montre que les fiches qui ont au moins été soumises une fois.
    status: filters.status ?? { in: ['SUBMITTED', 'VALIDATED', 'REJECTED'] },
    ...(filters.season ? { season: filters.season } : {}),
    ...(filters.payment ? { paymentStatus: filters.payment } : {}),
  };
  return prisma.clubEngagement.findMany({
    where,
    orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
    include: { club: { select: { id: true, name: true, shortCode: true, city: true } } },
  });
}

export async function getEngagementById(id: string) {
  await assertAdmin();
  return prisma.clubEngagement.findUnique({
    where: { id },
    include: { club: { select: { id: true, name: true, shortCode: true, city: true } } },
  });
}

export async function validateEngagement(id: string) {
  const user = await assertAdmin();
  const eng = await prisma.clubEngagement.findUnique({ where: { id }, select: { status: true, clubId: true } });
  if (!eng) throw new Error('Fiche introuvable.');
  if (eng.status !== 'SUBMITTED') throw new Error('Seule une fiche soumise peut être validée.');

  const saved = await prisma.clubEngagement.update({
    where: { id },
    data: { status: 'VALIDATED', validatedAt: new Date(), validatedByEmail: user.email ?? null, rejectedReason: null },
  });

  await logAudit({ action: 'VALIDATE_ENGAGEMENT', entity: 'ClubEngagement', entityId: id, metadata: { clubId: eng.clubId } });
  revalidatePath('/dashboard/ligue/engagements');
  revalidatePath(`/dashboard/ligue/engagements/${id}`);
  revalidatePath('/dashboard/club/engagement');
  return saved;
}

export async function rejectEngagement(id: string, reason: string) {
  const user = await assertAdmin();
  if (!reason.trim()) throw new Error('Le motif de refus est requis.');
  const eng = await prisma.clubEngagement.findUnique({ where: { id }, select: { status: true, clubId: true } });
  if (!eng) throw new Error('Fiche introuvable.');
  if (eng.status !== 'SUBMITTED') throw new Error('Seule une fiche soumise peut être refusée.');

  const saved = await prisma.clubEngagement.update({
    where: { id },
    data: { status: 'REJECTED', rejectedReason: reason.trim(), validatedAt: null, validatedByEmail: user.email ?? null },
  });

  await logAudit({ action: 'REJECT_ENGAGEMENT', entity: 'ClubEngagement', entityId: id, metadata: { clubId: eng.clubId, reason: reason.trim() } });
  revalidatePath('/dashboard/ligue/engagements');
  revalidatePath(`/dashboard/ligue/engagements/${id}`);
  revalidatePath('/dashboard/club/engagement');
  return saved;
}

export async function setEngagementPayment(id: string, status: EngagementPaymentStatus) {
  await assertAdmin();
  const eng = await prisma.clubEngagement.findUnique({ where: { id }, select: { clubId: true } });
  if (!eng) throw new Error('Fiche introuvable.');

  const saved = await prisma.clubEngagement.update({ where: { id }, data: { paymentStatus: status } });

  await logAudit({ action: 'SET_ENGAGEMENT_PAYMENT', entity: 'ClubEngagement', entityId: id, metadata: { clubId: eng.clubId, paymentStatus: status } });
  revalidatePath('/dashboard/ligue/engagements');
  revalidatePath(`/dashboard/ligue/engagements/${id}`);
  return saved;
}

/** Compteur de fiches en attente de validation (badge sidebar). */
export async function getPendingEngagementCount() {
  return prisma.clubEngagement.count({ where: { status: 'SUBMITTED' } });
}
