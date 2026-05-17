import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CONTENT_DEFS, isContentKey, type ContentKey } from "@/lib/siteContent";

/**
 * Lit une clé de contenu côté server. Retourne la valeur DB si présente,
 * sinon le default hard-codé (lib/siteContent.ts). Cached pour la durée du
 * render.
 */
export const getContent = cache(async (key: ContentKey): Promise<string> => {
  const row = await prisma.siteContent.findUnique({
    where: { key },
    select: { value: true },
  });
  if (row?.value && row.value.length > 0) return row.value;
  return CONTENT_DEFS[key].default;
});

/**
 * Lit toutes les clés en un seul aller-retour DB. À privilégier dans une page
 * server qui en consomme plusieurs (cf. /arbitrage qui en lit ~20).
 */
export const getAllContent = cache(
  async (): Promise<Record<ContentKey, string>> => {
    const rows = await prisma.siteContent.findMany({
      select: { key: true, value: true },
    });
    const overrides: Partial<Record<ContentKey, string>> = {};
    for (const r of rows) {
      if (isContentKey(r.key) && r.value.length > 0) {
        overrides[r.key] = r.value;
      }
    }
    const result = {} as Record<ContentKey, string>;
    for (const k of Object.keys(CONTENT_DEFS) as ContentKey[]) {
      result[k] = overrides[k] ?? CONTENT_DEFS[k].default;
    }
    return result;
  },
);
