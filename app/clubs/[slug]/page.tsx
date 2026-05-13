import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClubPageData, getAllClubs } from "@/lib/queries/club";
import { LRH, display, body, mono, ClubCrest } from "@/components/lrh/tokens";
import { formatMatchDay, formatMatchTime, formatStatus } from "@/lib/utils/match-format";
import ArticleCard from "@/components/blog/ArticleCard";

export const revalidate = 60;
export const dynamicParams = true;

type RouteParams = { slug: string };

export async function generateStaticParams() {
  const clubs = await getAllClubs();
  return clubs.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getClubPageData(slug);
  if (!data) return { title: "Club introuvable" };
  return {
    title: `${data.club.name} | LRH`,
    description: `Suivez ${data.club.name} (${data.club.city}) — classement, calendrier, actualités du hockey réunionnais.`,
    openGraph: {
      title: data.club.name,
      description: `Hockey Club de ${data.club.city}`,
      type: "website",
    },
  };
}

const labelMono: React.CSSProperties = {
  ...mono,
  fontSize: 10,
  color: LRH.mute,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 700,
};

function StandingRow({ s }: { s: any }) {
  const gd = s.goalsFor - s.goalsAgainst;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid " + LRH.hair,
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ ...mono, fontSize: 9, color: LRH.red, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
            {s.competition.season}
          </div>
          <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, marginTop: 2 }}>
            {s.competition.name}
          </div>
        </div>
        <div style={{
          ...display, fontWeight: 800, fontSize: 36, color: s.rank <= 3 ? LRH.gold : LRH.navy, letterSpacing: "-0.04em", lineHeight: 1,
        }}>
          {s.rank.toString().padStart(2, "0")}
          <span style={{ ...mono, fontSize: 11, color: LRH.mute, marginLeft: 6, fontWeight: 500 }}>
            / classement
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, paddingTop: 14, borderTop: "1px solid " + LRH.hair }}>
        <Stat label="J" value={s.played} />
        <Stat label="V" value={s.wins} />
        <Stat label="N" value={s.draws} />
        <Stat label="D" value={s.losses} />
        <Stat label="PTS" value={s.points} accent />
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: "0.08em" }}>
        <span>BUTS POUR {s.goalsFor}</span>
        <span>BUTS CONTRE {s.goalsAgainst}</span>
        <span>DIFF {(gd > 0 ? "+" : "") + gd}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string, value: number, accent?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...display, fontWeight: 800, fontSize: 22, color: accent ? LRH.red : LRH.navy, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function MatchRow({ m, clubId }: { m: any, clubId: string }) {
  const isHome = m.homeClub.id === clubId;
  const opponent = isHome ? m.awayClub : m.homeClub;
  const ourScore = isHome ? m.homeScore : m.awayScore;
  const oppScore = isHome ? m.awayScore : m.homeScore;
  const isFinished = m.status === "FINISHED";
  const isWin = isFinished && ourScore != null && oppScore != null && ourScore > oppScore;
  const isLoss = isFinished && ourScore != null && oppScore != null && ourScore < oppScore;
  const resultColor = isWin ? LRH.navy : isLoss ? LRH.red : LRH.mute;

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", background: "#fff", border: "1px solid " + LRH.hair, borderRadius: 10, gap: 16 }}>
      <div style={{ width: 64, flexShrink: 0 }}>
        <div style={{ ...mono, fontSize: 10, color: LRH.red, fontWeight: 700, letterSpacing: "0.1em" }}>
          {formatMatchDay(m.kickoffAt)}
        </div>
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: "0.08em" }}>
          {formatMatchTime(m.kickoffAt)}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ ...mono, fontSize: 9, color: LRH.mute, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {isHome ? "vs" : "@"}
        </span>
        <ClubCrest id={opponent.shortCode ?? undefined} size={28} />
        <Link href={`/clubs/${opponent.slug}`} style={{ ...display, fontSize: 14, fontWeight: 600, color: LRH.navy, textDecoration: "none" }}>
          {opponent.name}
        </Link>
      </div>
      {isFinished ? (
        <div style={{ ...display, fontWeight: 800, fontSize: 20, color: resultColor, letterSpacing: "-0.02em" }}>
          {ourScore}–{oppScore}
        </div>
      ) : (
        <div style={{ ...mono, fontSize: 10, color: LRH.mute, letterSpacing: "0.1em" }}>
          {m.matchday ? `J${m.matchday}` : "À VENIR"}
        </div>
      )}
    </div>
  );
}

export default async function ClubPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const data = await getClubPageData(slug);
  if (!data) notFound();

  const { club, standings, matches, news, memberCount } = data;

  return (
    <main style={{ minHeight: "100vh", background: LRH.paper }}>
      <header style={{
        background: LRH.navy,
        color: "#fff",
        padding: "48px 24px",
        borderBottom: "4px solid " + LRH.red,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link href="/clubs" style={{ ...mono, fontSize: 11, color: LRH.gold, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none", marginBottom: 24, display: "inline-block" }}>
            ← Tous les clubs
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <ClubCrest id={club.shortCode ?? undefined} size={96} />
            <div>
              <div style={{ ...mono, fontSize: 11, color: LRH.gold, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>
                {club.shortCode ?? "CLUB LRH"} · {club.city}
              </div>
              <h1 style={{ ...display, fontWeight: 800, fontSize: 48, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                {club.name}
              </h1>
              <p style={{ ...body, fontSize: 14, color: "rgba(255,255,255,0.65)", marginTop: 10 }}>
                {memberCount > 0 ? `${memberCount} licencié${memberCount > 1 ? "s" : ""}` : "Club affilié LRH"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        {/* Classements par compétition */}
        {standings.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ ...display, fontWeight: 700, fontSize: 28, color: LRH.navy, margin: "0 0 24px", letterSpacing: "-0.02em" }}>
              Classements
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {standings.map((s) => <StandingRow key={s.competition.id} s={s} />)}
            </div>
          </div>
        )}

        {/* Matches */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
          <div>
            <h2 style={labelMono}>Prochains matchs</h2>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {matches.upcoming.length === 0 ? (
                <div style={{ padding: 24, background: "#fff", border: "1px solid " + LRH.hair, borderRadius: 10 }}>
                  <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucun match programmé.</p>
                </div>
              ) : matches.upcoming.map((m) => <MatchRow key={m.id} m={m} clubId={club.id} />)}
            </div>
          </div>
          <div>
            <h2 style={labelMono}>Derniers résultats</h2>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {matches.past.length === 0 ? (
                <div style={{ padding: 24, background: "#fff", border: "1px solid " + LRH.hair, borderRadius: 10 }}>
                  <p style={{ ...body, fontSize: 13, color: LRH.mute, margin: 0 }}>Aucun résultat enregistré.</p>
                </div>
              ) : matches.past.map((m) => <MatchRow key={m.id} m={m} clubId={club.id} />)}
            </div>
          </div>
        </div>

        {/* Sponsors */}
        {club.sponsors.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={labelMono}>Partenaires du club</h2>
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 12 }}>
              {club.sponsors.map((s) => (
                <div key={s.id} style={{
                  padding: "10px 16px",
                  background: "#fff",
                  border: "1px solid " + LRH.hair,
                  borderRadius: 8,
                  ...body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: LRH.navy,
                }}>
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News */}
        {news.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
              <h2 style={{ ...display, fontWeight: 700, fontSize: 28, color: LRH.navy, margin: 0, letterSpacing: "-0.02em" }}>
                Actualités du club
              </h2>
              <Link href="/actualites" style={{ ...mono, fontSize: 11, color: LRH.red, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>
                Tout voir →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {news.map((n) => <ArticleCard key={n.id} article={n} />)}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
