import type { Metadata } from "next";
import { getAllContent } from "@/lib/queries/siteContent";
import { PratiqueSubPageClient } from "@/components/lrh/pages/PratiqueSubPageClient";
import { LRH } from "@/components/lrh/tokens";

export const revalidate = 3600;

export const metadata: Metadata = {
  // Nom du site ajouté par `title.template` (app/layout.tsx) — pas de suffixe ici.
  title: "Hockey Santé",
  description:
    "Activité physique adaptée sur prescription médicale, encadrée par des éducateurs Sport-Santé. Programme intégré au parcours sport-santé de La Réunion.",
};

export default async function HockeySantePage() {
  const content = await getAllContent();

  return (
    <PratiqueSubPageClient
      pageIndex="07.02"
      kicker="Pratiques · Hockey Santé"
      heroTitle={"Bouger,\nse soigner."}
      heroTag="Activité Physique Adaptée · Sur prescription"
      accent={LRH.red}
      introTitle={content['pratique.sante.intro.title']}
      introBody={content['pratique.sante.intro.body']}
      sections={[
        { num: '01', title: content['pratique.sante.who.title'], body: content['pratique.sante.who.body'] },
        { num: '02', title: content['pratique.sante.where.title'], body: content['pratique.sante.where.body'] },
        { num: '03', title: content['pratique.sante.how.title'], body: content['pratique.sante.how.body'] },
      ]}
      ctaTitle="Commission développement"
      ctaEmail={content['pratique.cta.email']}
      ctaNote={content['pratique.cta.note']}
      ctaSubject="Hockey Sante - LRH"
    />
  );
}
