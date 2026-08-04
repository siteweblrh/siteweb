import type { Metadata } from "next";
import { getAllContent } from "@/lib/queries/siteContent";
import { FormationPageClient } from "@/components/lrh/pages/FormationPageClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "Formation fédérale",
  description:
    "Diplômes fédéraux (DF1, DF2, DF3), formations de formateurs, parcours académie : tout le dispositif de formation FFH relayé par la Ligue Réunionnaise de Hockey.",
};

export default async function FormationPage() {
  const content = await getAllContent();
  const heroSubtitle = content['hero.formation.subtitle'];

  return <FormationPageClient content={content} heroSubtitle={heroSubtitle} />;
}
