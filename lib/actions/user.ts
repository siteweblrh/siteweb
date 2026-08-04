'use server';

import { prisma } from "@/lib/prisma";
import { requireAdmin } from '@/lib/auth/require-admin';
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import argon2 from "argon2";
import { sendEmail, buildInviteEmail } from "@/lib/auth/email";
import { logAudit } from "@/lib/audit";


function revalidateUsers() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ligue/users");
}

const UserCreateSchema = z.object({
  email: z.string().email("Email invalide"),
  name: z.string().min(1, "Nom requis"),
  password: z.string().min(8, "8 caractères minimum"),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  clubId: z.string().nullable().optional(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;

const UserUpdateSchema = z.object({
  email: z.string().email("Email invalide").optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  clubId: z.string().nullable().optional(),
});

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;

export async function listUsersAdmin() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clubId: true,
      club: { select: { id: true, name: true, shortCode: true, kind: true } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { articles: true, sessions: true } },
    },
  });
}

export async function createUser(input: UserCreateInput) {
  await requireAdmin();
  const data = UserCreateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Un compte existe déjà avec cet email.");

  if (data.clubId) {
    const club = await prisma.club.findUnique({ where: { id: data.clubId }, select: { id: true } });
    if (!club) throw new Error("Club introuvable.");
  }

  const hash = await argon2.hash(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      password: hash,
      role: data.role,
      clubId: data.clubId || null,
      mustChangePassword: true,
    },
    select: { id: true, email: true, name: true, role: true, clubId: true },
  });
  revalidateUsers();
  return user;
}

export async function updateUser(id: string, input: UserUpdateInput) {
  const session = await requireAdmin();
  const data = UserUpdateSchema.parse(input);

  // Empêcher un admin de se rétrograder lui-même (sinon il se coupe l'accès)
  if (id === session.user!.id && data.role && data.role !== "ADMIN") {
    throw new Error("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  }

  if (data.clubId) {
    const club = await prisma.club.findUnique({ where: { id: data.clubId }, select: { id: true } });
    if (!club) throw new Error("Club introuvable.");
  }

  if (data.email) {
    const dup = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id } },
      select: { id: true },
    });
    if (dup) throw new Error("Cet email est déjà utilisé par un autre compte.");
  }

  const payload: Record<string, unknown> = {};
  if (data.email !== undefined) payload.email = data.email.toLowerCase().trim();
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.role !== undefined) payload.role = data.role;
  if (data.clubId !== undefined) payload.clubId = data.clubId || null;

  await prisma.user.update({ where: { id }, data: payload as any });
  revalidateUsers();
}

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "8 caractères minimum"),
});

export async function resetUserPassword(id: string, newPassword: string) {
  await requireAdmin();
  const data = ResetPasswordSchema.parse({ newPassword });
  const hash = await argon2.hash(data.newPassword);
  await prisma.user.update({ where: { id }, data: { password: hash, mustChangePassword: true } });
  // Invalider les sessions actives pour forcer une reconnexion
  await prisma.session.deleteMany({ where: { userId: id } });
  revalidateUsers();
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();
  if (id === session.user!.id) {
    throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { _count: { select: { articles: true } } },
  });
  if (!user) throw new Error("Compte introuvable.");
  if (user._count.articles > 0) {
    throw new Error(
      `Ce compte a publié ${user._count.articles} article${user._count.articles > 1 ? "s" : ""}. Transférez-les ou supprimez-les d'abord.`,
    );
  }
  await prisma.user.delete({ where: { id } });
  revalidateUsers();
}

export type UserAdminRow = Awaited<ReturnType<typeof listUsersAdmin>>[number];

/**
 * Marque le tutoriel d'accueil comme vu pour l'utilisateur courant. Appelé
 * depuis le WelcomeModal côté client à la fermeture ("J'ai compris" ou skip).
 * Idempotent : si déjà marqué, no-op silencieux.
 */
export async function markOnboardingComplete() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Non autorisé');
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompletedAt: new Date() },
  });
  revalidatePath('/dashboard');
}

// Mot de passe provisoire : 16 chars, alphabet sans I/l/0/O pour éviter
// les confusions de lecture quand l'utilisateur tape à la main.
function generateProvisionalPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const buf = new Uint32Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let out = '';
  for (const v of buf) out += chars[v % chars.length];
  return out;
}

const InviteSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(1, 'Nom requis'),
  role: z.enum(['ADMIN', 'USER']).default('USER'),
  clubId: z.string().nullable().optional(),
});

export type InviteUserInput = z.infer<typeof InviteSchema>;

/**
 * Crée un compte avec mot de passe provisoire généré automatiquement et
 * envoie un email d'invitation. L'admin reçoit aussi le mot de passe en
 * retour pour pouvoir le transmettre par un autre canal (WhatsApp, tel)
 * si l'email ne passe pas.
 *
 * Le compte est créé avec `mustChangePassword: true` — l'utilisateur sera
 * forcé de choisir un nouveau mot de passe à sa première connexion.
 */
export async function inviteUser(input: InviteUserInput) {
  await requireAdmin();
  const data = InviteSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) throw new Error('Un compte existe déjà avec cet email.');

  let clubName: string | null = null;
  if (data.clubId) {
    const club = await prisma.club.findUnique({
      where: { id: data.clubId },
      select: { id: true, name: true },
    });
    if (!club) throw new Error('Club introuvable.');
    clubName = club.name;
  }
  if (data.role === 'USER' && !data.clubId) {
    throw new Error('Un compte manager doit être rattaché à un club.');
  }

  const password = generateProvisionalPassword();
  const hash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      password: hash,
      role: data.role,
      clubId: data.clubId || null,
      mustChangePassword: true,
    },
    select: { id: true, email: true, name: true, role: true, clubId: true },
  });

  // Envoi de l'email d'invitation. Si Resend n'est pas configuré, sendEmail
  // retourne { ok: false } mais le compte est quand même créé — l'admin
  // récupère le mdp via la réponse de cette action et peut le transmettre.
  const loginUrl = (process.env.NEXTAUTH_URL ?? 'https://lrh.re') + '/auth/login';
  const { subject, html, text } = buildInviteEmail({
    loginUrl,
    email: user.email!,
    password,
    clubName,
  });
  const mail = await sendEmail({ to: user.email!, subject, html, text });

  await logAudit({
    action: 'INVITE_USER',
    entity: 'User',
    entityId: user.id,
    metadata: {
      email: user.email,
      role: user.role,
      clubId: user.clubId,
      clubName,
      emailSent: mail.ok,
    },
  });

  revalidateUsers();
  return {
    user,
    password,
    emailSent: mail.ok,
    emailError: mail.error,
  };
}
