import React from "react";
import type { Metadata } from "next";
import { getDirectoryClubs } from "@/lib/queries/club";
import { getContent } from "@/lib/queries/siteContent";
import { LicencePageClient } from "@/components/lrh/pages/LicencePageClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "Prendre une licence",
  description:
    "Trouvez votre club de hockey à La Réunion — annuaire complet des clubs affiliés, classés par proximité avec votre commune.",
  alternates: { canonical: "/licence" },
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
