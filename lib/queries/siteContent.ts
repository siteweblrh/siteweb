import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CACHE_TAGS, cachePublic } from "@/lib/cache/public";
import { CONTENT_DEFS, isContentKey, type ContentKey } from "@/lib/siteContent";

/**
 * Deux niveaux de cache, complémentaires :
 * - `cache` (React) déduplique les appels DANS un même rendu ;
 * - `cachePublic` (Next) conserve le résultat ENTRE les requêtes, donc évite de
 *   réveiller Neon. Indispensable ici : ces lectures sont appelées depuis des
 *   pages dynamiques (`/classements`, `/actualites`) où le `revalidate` de
 *   segment ne s'applique pas. Cf. lib/cache/public.ts pour le contexte.
 */

/**
 * Lit une clé de contenu côté server. Retourne la valeur DB si présente,
 * sinon le default hard-codé (lib/siteContent.ts).
 */
const fetchContent = cachePublic(
  async (key: ContentKey): Promise<string | null> => {
    const row = await prisma.siteContent.findUnique({
      where: { key },
      select: { value: true },
    });
    return row?.value && row.value.length > 0 ? row.value : null;
  },
  ["site-content:one"],
  [CACHE_TAGS.siteContent],
);

export const getContent = cache(async (key: ContentKey): Promise<string> => {
  const value = await fetchContent(key);
  return value ?? CONTENT_DEFS[key].default;
});

/**
 * Lit toutes les clés en un seul aller-retour DB. À privilégier dans une page
 * server qui en consomme plusieurs (cf. /arbitrage qui en lit ~20).
 */
const fetchAllContentRows = cachePublic(
  async (): Promise<{ key: string; value: string }[]> =>
    prisma.siteContent.findMany({ select: { key: true, value: true } }),
  ["site-content:all"],
  [CACHE_TAGS.siteContent],
);

export const getAllContent = cache(
  async (): Promise<Record<ContentKey, string>> => {
    const rows = await fetchAllContentRows();
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
