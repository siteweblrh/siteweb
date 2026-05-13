import LrhSite from "@/components/lrh/LrhSite";
import { getHomeData } from "@/lib/queries/home";

export const revalidate = 60;

export default async function Home() {
  const data = await getHomeData();
  return (
    <main className="min-h-screen">
      <LrhSite data={data} />
    </main>
  );
}
