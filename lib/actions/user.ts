'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import argon2 from "argon2";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") throw new Error("Réservé aux administrateurs");
  return session;
}

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
  await prisma.user.update({ where: { id }, data: { password: hash } });
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
