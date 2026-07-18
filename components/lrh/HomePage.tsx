import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";
import { getAllContent } from "@/lib/queries/siteContent";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { sportsOrganizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonLd";
import { optimizeImageUrl } from "@/lib/utils/image-url";

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
  // L'image hero (background-image CSS) est l'élément LCP de la home.
  // CSS background-image n'a pas de fetchpriority natif → on préchargé via
  // <link rel="preload"> avec fetchPriority="high" pour que le browser
  // démarre le download AVANT que le CSS soit parsé.
  const heroImage = content['home.hero.background.gazon'];
  const heroImagePreload = heroImage
    ? optimizeImageUrl(heroImage, ssrIsMobile ? 800 : 1600, 'good')
    : null;
  return (
    <main className="min-h-screen">
      {heroImagePreload && (
        <link
          rel="preload"
          as="image"
          href={heroImagePreload}
          fetchPriority="high"
        />
      )}
      <JsonLd data={sportsOrganizationJsonLd({ socials })} />
      <JsonLd data={websiteJsonLd()} />
      <LrhSite data={data} content={content} ssrIsMobile={ssrIsMobile} />
    </main>
  );
}
