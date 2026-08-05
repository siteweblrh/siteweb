import React from "react";
import { statSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { getDirectoryClubs } from "@/lib/queries/club";
import { getContent } from "@/lib/queries/siteContent";
import { LicencePageClient } from "@/components/lrh/pages/LicencePageClient";

export const revalidate = 3600;

/** Nom du fichier dans `public/`. Servi tel quel à la racine du site. */
const ENGAGEMENT_PDF = 'Fiche-Engagement-lrh-editable-2026.pdf';

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "Prendre une licence",
  description:
    "Trouvez votre club de hockey à La Réunion — annuaire complet des clubs affiliés, classés par proximité avec votre commune.",
  alternates: { canonical: "/licence" },
};

/**
 * Poids du PDF lu sur le disque au build plutôt qu'écrit en dur : un chiffre
 * recopié à la main devient faux à la première mise à jour du document, et
 * personne ne s'en aperçoit. La page est prérendue (`revalidate = 3600`), donc
 * cette lecture ne coûte rien à l'exécution.
 *
 * Défaillance : si le fichier disparaît, on rend `null` et le bloc n'est pas
 * affiché — plutôt qu'un lien mort vers un 404.
 */
function engagementPdfSize(): string | null {
  try {
    const bytes = statSync(join(process.cwd(), 'public', ENGAGEMENT_PDF)).size;
    return `PDF · ${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
  } catch {
    return null;
  }
}

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
      engagementPdf={
        engagementPdfSize()
          ? { href: `/${ENGAGEMENT_PDF}`, fileLabel: engagementPdfSize()! }
          : null
      }
    />
  );
}
