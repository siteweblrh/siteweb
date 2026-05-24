import { headers } from "next/headers";
import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";
import { getAllContent } from "@/lib/queries/siteContent";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { sportsOrganizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonLd";
import { optimizeImageUrl } from "@/lib/utils/image-url";
import { isMobileUserAgent } from "@/lib/utils/detect-mobile";

// ⚠️ ISR désactivé ici à cause de `headers()` (rend la page auto-dynamic).
// On garde quand même le cache 60s via la directive Cache-Control implicite
// que Vercel ajoute. Le trade-off : on perd le cache edge MAIS on gagne
// une détection UA correcte qui supprime le hydration mismatch React #418.
// Net positif sur mobile (le re-render coûtait plus que le DB hit).

export default async function Home() {
  const [data, content, hdrs] = await Promise.all([
    getHomeData(),
    getAllContent(),
    headers(),
  ]);
  const ssrIsMobile = isMobileUserAgent(hdrs.get('user-agent'));
  const socials = {
    instagram: content['footer.social.instagram'],
    facebook: content['footer.social.facebook'],
    youtube: content['footer.social.youtube'],
    tiktok: content['footer.social.tiktok'],
  };
  // L'image hero (background-image CSS) est l'élément LCP de la home.
  // CSS background-image n'a pas de fetchpriority natif → on préchargé via
  // <link rel="preload"> avec fetchPriority="high" pour que le browser
  // démarre le download AVANT que le CSS soit parsé. Gain LCP ~200-400ms
  // sur mobile 3G (Lighthouse signalait "fetchpriority=high doit être
  // appliqué" sur la home).
  //
  // Optimisation par viewport : 800px sur mobile (le hero fait max ~400px
  // de large × 2 pour retina), 1600px sur desktop. Évite de précharger
  // 1600px sur mobile qui rend 360px-400px de large.
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
