import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getContent } from "@/lib/queries/siteContent";

// 120 s était sous le suspend timeout Neon (~5 min) : le Footer étant sur
// toutes les pages, un visiteur toutes les 2 min suffisait à maintenir le
// compute éveillé en permanence. Les sponsors et les liens sociaux changent
// quelques fois par an, et sponsor.ts/siteContent.ts appellent revalidatePath
// à chaque modif — 1 h ne coûte donc aucune fraîcheur.
export const revalidate = 3600;

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
          select: { id: true, name: true, logo: true, website: true },
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
