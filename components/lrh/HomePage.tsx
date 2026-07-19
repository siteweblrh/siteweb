import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";
import { getAllContent } from "@/lib/queries/siteContent";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { sportsOrganizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonLd";

/** Rendu serveur partagé de la home, sans aucune API dynamique (pas de
 *  `headers()`), pour que les deux routes qui l'utilisent restent ISR :
 *    - `/`  → ssrIsMobile=false (variante desktop)
 *    - `/m` → ssrIsMobile=true  (variante mobile, servie via rewrite UA
 *      dans proxy.ts — jamais linkée, noindex)
 *  Le choix de variante se fait donc au Edge (rewrite) et chaque variante
 *  est un HTML statique revalidé, au lieu d'un rendu dynamique par requête. */
export async function HomePage({ ssrIsMobile }: { ssrIsMobile: boolean }) {
  const [data, content] = await Promise.all([getHomeData(), getAllContent()]);
  const socials = {
    instagram: content['footer.social.instagram'],
    facebook: content['footer.social.facebook'],
    youtube: content['footer.social.youtube'],
    tiktok: content['footer.social.tiktok'],
  };
  // Pas de <link rel="preload"> pour l'image hero : elle est désormais un vrai
  // <img fetchpriority="high"> (HeroBackdrop dans sections/Hero.tsx), que le
  // preload scanner découvre aussi tôt et priorise davantage qu'un preload.
  // Un preload en plus risquerait un double download si le <picture> retenait
  // une variante de breakpoint différente de l'URL préchargée.
  return (
    <main className="min-h-screen">
      <JsonLd data={sportsOrganizationJsonLd({ socials })} />
      <JsonLd data={websiteJsonLd()} />
      <LrhSite data={data} content={content} ssrIsMobile={ssrIsMobile} />
    </main>
  );
}
