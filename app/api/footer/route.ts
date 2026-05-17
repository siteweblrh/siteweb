import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getContent } from "@/lib/queries/siteContent";

export const revalidate = 120;

/**
 * Données partagées du footer : sponsors de la Ligue + URLs réseaux sociaux
 * + tagline. Appelé côté client par FooterDesktop au mount.
 */
export async function GET() {
  try {
    const [sponsors, instagram, facebook, youtube, tiktok, tagline] =
      await Promise.all([
        prisma.sponsor.findMany({
          where: { scope: "LIGUE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, logo: true },
        }),
        getContent("footer.social.instagram"),
        getContent("footer.social.facebook"),
        getContent("footer.social.youtube"),
        getContent("footer.social.tiktok"),
        getContent("footer.tagline"),
      ]);

    return NextResponse.json({
      sponsors,
      social: { instagram, facebook, youtube, tiktok },
      tagline,
    });
  } catch {
    return NextResponse.json(
      { sponsors: [], social: {}, tagline: "" },
      { status: 200 },
    );
  }
}
