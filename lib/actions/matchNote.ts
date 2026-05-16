'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function loadSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non autorisé");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, clubId: true },
  });
  if (!user) throw new Error("Compte introuvable");
  return user;
}

async function requireMatchAccess(matchId: string) {
  const user = await loadSessionUser();
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, homeClubId: true, awayClubId: true },
  });
  if (!match) throw new Error("Match introuvable");

  if (user.role !== "ADMIN") {
    const isConcernedManager =
      user.clubId === match.homeClubId || user.clubId === match.awayClubId;
    if (!isConcernedManager) {
      throw new Error("Non autorisé à intervenir sur ce match");
    }
  }
  return { user, match };
}

function revalidateMatchNotes() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/matches");
}

const NoteSchema = z.object({
  body: z
    .string()
    .min(1, "Note vide")
    .max(2000, "Note trop longue (max 2000 caractères)"),
});

export type MatchNoteInput = z.infer<typeof NoteSchema>;

export async function listMatchNotes(matchId: string) {
  await requireMatchAccess(matchId);
  return prisma.matchNote.findMany({
    where: { matchId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      authorId: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          club: { select: { id: true, name: true, shortCode: true } },
        },
      },
    },
  });
}

export type MatchNoteRow = Awaited<ReturnType<typeof listMatchNotes>>[number];

export async function createMatchNote(matchId: string, input: MatchNoteInput) {
  const { user } = await requireMatchAccess(matchId);
  const data = NoteSchema.parse(input);

  const created = await prisma.matchNote.create({
    data: {
      matchId,
      authorId: user.id,
      body: data.body.trim(),
    },
  });
  revalidateMatchNotes();
  return created;
}

export async function deleteMatchNote(noteId: string) {
  const user = await loadSessionUser();
  const note = await prisma.matchNote.findUnique({
    where: { id: noteId },
    select: { id: true, authorId: true },
  });
  if (!note) throw new Error("Note introuvable");

  if (user.role !== "ADMIN" && note.authorId !== user.id) {
    throw new Error("Vous ne pouvez supprimer que vos propres notes");
  }

  await prisma.matchNote.delete({ where: { id: noteId } });
  revalidateMatchNotes();
}
