import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";
import { getAllContent } from "@/lib/queries/siteContent";

export const revalidate = 60;

export default async function Home() {
  const [data, content] = await Promise.all([getHomeData(), getAllContent()]);
  return (
    <main className="min-h-screen">
      <LrhSite data={data} content={content} />
    </main>
  );
}
