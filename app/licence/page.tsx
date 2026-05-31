import React from "react";
import type { Metadata } from "next";
import { getDirectoryClubs } from "@/lib/queries/club";
import { getContent } from "@/lib/queries/siteContent";
import { LicencePageClient } from "@/components/lrh/pages/LicencePageClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Prendre une licence | Ligue Réunionnaise de Hockey",
  description:
    "Trouvez votre club de hockey à La Réunion — annuaire complet des clubs affiliés, classés par proximité avec votre commune.",
};

export default async function LicencePage() {
  const [clubs, heroSubtitle, introText] = await Promise.all([
    getDirectoryClubs(),
    getContent('hero.licence.subtitle'),
    getContent('licence.intro.text'),
  ]);

  return (
    <LicencePageClient
      clubs={clubs}
      heroSubtitle={heroSubtitle}
      introText={introText}
    />
  );
}
