import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllClubs } from "@/lib/queries/club";
import { LRH, display, body, mono, ClubCrest } from "@/components/lrh/tokens";
import BackToHome from "@/components/lrh/BackToHome";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Clubs | Ligue Réunionnaise de Hockey",
  description: "Les clubs affiliés à la Ligue Réunionnaise de Hockey à La Réunion.",
};

export default async function ClubsPage() {
  const clubs = await getAllClubs();

  return (
    <main style={{ minHeight: "100vh", background: LRH.paper }}>
      <header style={{
        background: LRH.navy,
        color: "#fff",
        padding: "64px 24px 56px",
        borderBottom: "4px solid " + LRH.red,
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <BackToHome />
          </div>
          <div style={{ ...mono, fontSize: 11, color: LRH.gold, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
            ● Affiliés à la Ligue
          </div>
          <h1 style={{ ...display, fontWeight: 800, fontSize: 48, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Clubs
          </h1>
          <p style={{ ...body, fontSize: 16, color: "rgba(255,255,255,0.75)", marginTop: 12, maxWidth: 600 }}>
            {clubs.length} club{clubs.length > 1 ? "s" : ""} engagé{clubs.length > 1 ? "s" : ""} dans le hockey réunionnais — gazon &amp; salle.
          </p>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        {clubs.length === 0 ? (
          <div style={{ padding: 48, background: "#fff", border: "1px solid " + LRH.hair, borderRadius: 16, textAlign: "center" }}>
            <p style={{ ...body, fontSize: 14, color: LRH.mute, margin: 0 }}>Aucun club enregistré pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {clubs.map((c) => (
              <Link
                key={c.id}
                href={`/clubs/${c.slug}`}
                style={{
                  display: "flex", alignItems: "center", gap: 18,
                  padding: 22, background: "#fff", border: "1px solid " + LRH.hair, borderRadius: 14,
                  textDecoration: "none", color: "inherit",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
              >
                <ClubCrest id={c.shortCode ?? undefined} size={56} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...display, fontWeight: 700, fontSize: 18, color: LRH.navy, lineHeight: 1.2 }}>
                    {c.name}
                  </div>
                  <div style={{ ...mono, fontSize: 10.5, color: LRH.mute, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
                    {c.city}
                  </div>
                </div>
                <span style={{ ...mono, fontSize: 14, color: LRH.red, fontWeight: 700 }}>→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
