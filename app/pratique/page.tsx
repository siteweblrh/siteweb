import type { Metadata } from "next";
import { getAllContent } from "@/lib/queries/siteContent";
import { PratiquePageClient } from "@/components/lrh/pages/PratiquePageClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "Pratiques · Activités diverses",
  description:
    "Hockey loisirs, hockey santé, sport adapté — les autres formes de pratique encadrées par la Ligue Réunionnaise de Hockey. Pour tous les âges et tous les niveaux.",
};

export default async function PratiquePage() {
  const content = await getAllContent();
  return (
    <PratiquePageClient
      content={content}
      heroSubtitle={content['hero.pratique.subtitle']}
    />
  );
}
