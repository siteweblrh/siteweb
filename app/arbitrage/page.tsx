import React from "react";
import type { Metadata } from "next";
import {
  getPublicReferees,
  getUpcomingDesignations,
  getRecentDesignations,
} from "@/lib/queries/referee";
import { getCommissions } from "@/lib/queries/ligue";
import { getAllContent } from "@/lib/queries/siteContent";
import { ArbitragePageClient } from "@/components/lrh/pages/ArbitragePageClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Arbitrage | Ligue Réunionnaise de Hockey",
  description:
    "Le corps arbitral de la Ligue Réunionnaise de Hockey — effectif officiel, désignations à venir, commission d'arbitrage et parcours de formation.",
};

export default async function ArbitragePage() {
  const [referees, upcomingGazon, recentGazon, upcomingSalle, recentSalle, commissions, content] =
    await Promise.all([
      getPublicReferees(),
      getUpcomingDesignations("GAZON", 8),
      getRecentDesignations("GAZON", 6),
      getUpcomingDesignations("SALLE", 8),
      getRecentDesignations("SALLE", 6),
      getCommissions(),
      getAllContent(),
    ]);

  // Commission "arbitrage" si elle existe, identifiée par slug.
  const arbitrageCommission =
    commissions.find((c) => c.slug === "arbitrage") ?? null;

  return (
    <ArbitragePageClient
      referees={referees}
      designations={{
        gazon: { upcoming: upcomingGazon, recent: recentGazon },
        salle: { upcoming: upcomingSalle, recent: recentSalle },
      }}
      commission={arbitrageCommission}
      content={content}
    />
  );
}
