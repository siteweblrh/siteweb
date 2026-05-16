import React from "react";
import type { Metadata } from "next";
import { getAllClubsForListPage } from "@/lib/queries/club";
import { ClubsPageClient } from "@/components/lrh/pages/ClubsPageClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Clubs | Ligue Réunionnaise de Hockey",
  description:
    "Les clubs et ententes affiliés à la Ligue Réunionnaise de Hockey à La Réunion — hockey sur gazon et en salle.",
};

export default async function ClubsPage() {
  const clubs = await getAllClubsForListPage();
  return <ClubsPageClient clubs={clubs} />;
}
