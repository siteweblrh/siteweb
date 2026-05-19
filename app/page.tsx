import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";
import { getAllContent } from "@/lib/queries/siteContent";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { sportsOrganizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonLd";

export const revalidate = 60;

export default async function Home() {
  const [data, content] = await Promise.all([getHomeData(), getAllContent()]);
  const socials = {
    instagram: content['footer.social.instagram'],
    facebook: content['footer.social.facebook'],
    youtube: content['footer.social.youtube'],
    tiktok: content['footer.social.tiktok'],
  };
  return (
    <main className="min-h-screen">
      <JsonLd data={sportsOrganizationJsonLd({ socials })} />
      <JsonLd data={websiteJsonLd()} />
      <LrhSite data={data} content={content} />
    </main>
  );
}
