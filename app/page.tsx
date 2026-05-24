import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";
import { getAllContent } from "@/lib/queries/siteContent";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { sportsOrganizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonLd";
import { optimizeImageUrl } from "@/lib/utils/image-url";

export const revalidate = 60;

export default async function Home() {
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
  // démarre le download AVANT que le CSS soit parsé. Gain LCP ~200-400ms
  // sur mobile 3G (Lighthouse signalait "fetchpriority=high doit être
  // appliqué" sur la home).
  //
  // L'initial state du toggle mode est 'gazon' (cf. LrhSite.tsx) donc on
  // précharge la gazon. Si l'image existe (admin l'a configurée via
  // /dashboard/ligue/contenu) on précharge l'URL optimisée.
  const heroImage = content['home.hero.background.gazon'];
  const heroImagePreload = heroImage ? optimizeImageUrl(heroImage, 1600, 'good') : null;
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
      <LrhSite data={data} content={content} />
    </main>
  );
}
