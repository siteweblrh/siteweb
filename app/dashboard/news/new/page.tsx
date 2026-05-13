import React from 'react';
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewsForm from './NewsForm';
import { redirect } from 'next/navigation';

export default async function NewNewsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id },
  });

  if (!user || !user.clubId) {
    redirect('/dashboard');
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <NewsForm clubId={user.clubId} />
    </div>
  );
}
