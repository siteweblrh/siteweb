import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import argon2 from 'argon2';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, '8 caractères minimum'),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Données invalides' },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ message: 'Compte sans mot de passe.' }, { status: 400 });
  }

  const valid = await argon2.verify(user.password, currentPassword);
  if (!valid) {
    return NextResponse.json({ message: 'Mot de passe actuel incorrect.' }, { status: 403 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { message: "Le nouveau mot de passe doit être différent de l'ancien." },
      { status: 400 },
    );
  }

  const hash = await argon2.hash(newPassword);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hash, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
