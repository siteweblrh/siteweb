import type { Metadata } from "next";
import { getAllContent } from "@/lib/queries/siteContent";
import { PratiqueSubPageClient } from "@/components/lrh/pages/PratiqueSubPageClient";
import { LRH } from "@/components/lrh/tokens";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Hockey Loisirs | Ligue Réunionnaise de Hockey",
  description:
    "Pratique du hockey sans compétition, encadrée par les clubs affiliés. Créneaux loisirs hebdomadaires pour adultes de tous niveaux, à La Réunion.",
};

export default async function HockeyLoisirsPage() {
  const content = await getAllContent();

  return (
    <PratiqueSubPageClient
      pageIndex="07.01"
      kicker="Pratiques · Hockey Loisirs"
      heroTitle={"Du hockey,\nsans pression."}
      heroTag="Pratique libre · Adultes"
      accent={LRH.gold}
      introTitle={content['pratique.loisir.intro.title']}
      introBody={content['pratique.loisir.intro.body']}
      sections={[
        { num: '01', title: content['pratique.loisir.who.title'], body: content['pratique.loisir.who.body'] },
        { num: '02', title: content['pratique.loisir.where.title'], body: content['pratique.loisir.where.body'] },
        { num: '03', title: content['pratique.loisir.how.title'], body: content['pratique.loisir.how.body'] },
      ]}
      ctaTitle="Commission développement"
      ctaEmail={content['pratique.cta.email']}
      ctaNote={content['pratique.cta.note']}
      ctaSubject="Hockey Loisirs - LRH"
    />
  );
}
