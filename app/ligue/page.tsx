import { prisma } from "@/lib/prisma";
import { getBureau, getCommissions } from "@/lib/queries/ligue";
import { getContent } from "@/lib/queries/siteContent";
import { LiguePageClient } from "@/components/lrh/pages/LiguePageClient";
import type { LigueStat } from "@/components/lrh/sections";

export const metadata = {
  title: "La Ligue · Ligue Réunionnaise de Hockey",
  description: "Bureau exécutif et commissions de la Ligue Réunionnaise de Hockey — l'institution qui structure le hockey à La Réunion.",
};

export default async function LiguePage() {
  const [bureau, commissions, clubsCount, membersCount, competitionsCount, heroSubtitle] =
    await Promise.all([
      getBureau(),
      getCommissions(),
      prisma.club.count(),
      prisma.member.count(),
      prisma.competition.count(),
      getContent('hero.ligue.subtitle'),
    ]);

  const stats: LigueStat[] = [
    { label: "Clubs affiliés", value: clubsCount },
    { label: "Licenciés", value: membersCount },
    { label: "Compétitions", value: competitionsCount, unit: "saison" },
    { label: "Disciplines", value: 2, unit: "Gazon · Salle" },
  ];

  return (
    <LiguePageClient
      bureau={bureau}
      commissions={commissions}
      stats={stats}
      heroSubtitle={heroSubtitle}
    />
  );
}
