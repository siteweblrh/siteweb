import { prisma } from "@/lib/prisma";
import { getBureau, getCommissions } from "@/lib/queries/ligue";
import { getContent } from "@/lib/queries/siteContent";
import { LiguePageClient } from "@/components/lrh/pages/LiguePageClient";
import type { LigueStat } from "@/components/lrh/sections";

export const metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "La Ligue",
  description: "Bureau exécutif et commissions de la Ligue Réunionnaise de Hockey — l'institution qui structure le hockey à La Réunion.",
};

export default async function LiguePage() {
  const [bureau, commissions, clubsCount, membersCount, competitionsCount, heroSubtitle] =
    await Promise.all([
      getBureau(),
      getCommissions(),
      // STANDALONE seulement — une ENTENTE est un regroupement compétitif,
      // pas une structure affiliée. Sans ce filtre, /ligue annonçait 8 clubs
      // pendant que /clubs et /licence en affichaient 6 (les deux ne listent
      // que les autonomes). Cf. ClubsPageClient.tsx : `standaloneClubs`.
      prisma.club.count({ where: { kind: 'STANDALONE' } }),
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
