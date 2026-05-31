import type { Metadata } from "next";
import { getAllContent } from "@/lib/queries/siteContent";
import { FormationPageClient } from "@/components/lrh/pages/FormationPageClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Formation fédérale | Ligue Régionale de Hockey",
  description:
    "Diplômes fédéraux (DF1, DF2, DF3), formations de formateurs, parcours académie : tout le dispositif de formation FFH relayé par la Ligue Régionale de Hockey.",
};

export default async function FormationPage() {
  const content = await getAllContent();
  const heroSubtitle = content['hero.formation.subtitle'];

  return <FormationPageClient content={content} heroSubtitle={heroSubtitle} />;
}
