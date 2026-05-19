import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllClubs, getClubPageDataByMode } from "@/lib/queries/club";
import { parseSocials } from "@/lib/clubSocials";
import { ClubPageClient } from "@/components/lrh/pages/ClubPageClient";
import { JsonLd } from "@/components/lrh/seo/JsonLd";
import { sportsTeamJsonLd, breadcrumbListJsonLd } from "@/lib/seo/jsonLd";

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

  const { club, matchesByMode, standingsByMode, news, members, memberCount } = data;

  return (
    <>
      <JsonLd
        data={sportsTeamJsonLd({
          slug: club.slug,
          name: club.name,
          city: club.city,
          shortCode: club.shortCode,
          logo: club.logo,
          foundedYear: club.foundedYear,
          website: club.website,
        })}
      />
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: 'Accueil', url: '/' },
          { name: 'Clubs', url: '/clubs' },
          { name: club.name, url: `/clubs/${club.slug}` },
        ])}
      />
      <ClubPageClient
      club={{
        id: club.id,
        slug: club.slug,
        name: club.name,
        city: club.city,
        shortCode: club.shortCode,
        email: club.email,
        phone: club.phone,
        website: club.website,
        address: club.address,
        socials: parseSocials(club.socials),
        description: club.description,
        primaryColor: club.primaryColor,
        logo: club.logo,
        foundedYear: club.foundedYear,
      }}
      sponsors={club.sponsors.map((s) => ({ id: s.id, name: s.name, logo: s.logo, website: s.website }))}
      matchesByMode={matchesByMode}
      standingsByMode={standingsByMode}
      news={news}
      members={members}
      memberCount={memberCount}
    />
    </>
  );
}
