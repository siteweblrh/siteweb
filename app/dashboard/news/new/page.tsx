import React from 'react';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewsForm from './NewsForm';
import { redirect } from 'next/navigation';
import { getClubs } from '@/lib/actions/clubs';

export default async function NewNewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { club: true },
  });

  if (!user) redirect('/auth/login');

  const isAdmin = user.role === 'ADMIN';

  if (!user.clubId && !isAdmin) {
    redirect('/dashboard');
  }

  const clubs = isAdmin ? await getClubs() : [];

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <NewsForm
        defaultClubId={user.clubId ?? null}
        isAdmin={isAdmin}
        clubs={clubs}
      />
    </div>
  );
}
