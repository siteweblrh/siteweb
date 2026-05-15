import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllClubs, getClubPageDataByMode } from "@/lib/queries/club";
import { ClubPageClient } from "@/components/lrh/pages/ClubPageClient";

export const revalidate = 60;
export const dynamicParams = true;

type RouteParams = { slug: string };

export async function generateStaticParams() {
  const clubs = await getAllClubs();
  return clubs.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getClubPageDataByMode(slug);
  if (!data) return { title: "Club introuvable" };
  return {
    title: `${data.club.name} | LRH`,
    description: `Calendrier, résultats et classement de ${data.club.name} (${data.club.city}) — hockey gazon et salle, Ligue Réunionnaise de Hockey.`,
    openGraph: {
      title: data.club.name,
      description: `${data.club.name} — ${data.club.city} · LRH`,
      type: "website",
    },
  };
}

export default async function ClubPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const data = await getClubPageDataByMode(slug);
  if (!data) notFound();

  const { club, matchesByMode, standingsByMode, news, memberCount } = data;

  return (
    <ClubPageClient
      club={{
        id: club.id,
        slug: club.slug,
        name: club.name,
        city: club.city,
        shortCode: club.shortCode,
      }}
      sponsors={club.sponsors.map((s) => ({ id: s.id, name: s.name, logo: s.logo }))}
      matchesByMode={matchesByMode}
      standingsByMode={standingsByMode}
      news={news}
      memberCount={memberCount}
    />
  );
}
