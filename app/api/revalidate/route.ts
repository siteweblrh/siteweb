import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { auth } from '@/lib/auth';
import { CACHE_TAGS, revalidatePublic, type CacheTag } from '@/lib/cache/public';
import { errorMessage } from '@/lib/utils/error-message';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Purge à la demande du cache de données des pages publiques.
 *
 * POURQUOI CETTE ROUTE EXISTE
 * ---------------------------
 * `lib/cache/public.ts` garde les données publiques jusqu'à 1 h. Ce filet est
 * levé par `revalidatePublic()`, que seules les server actions de
 * `lib/actions/*` appellent. Tout ce qui écrit en base SANS passer par une
 * action — un script de saisie de feuille de match, un `psql`, une correction
 * manuelle — laisse donc les pages publiques sur l'ancien état.
 *
 * Constaté le 2026-09-20 en saisissant la J02 salle : `/match/[id]` affichait
 * les nouveaux buteurs, tandis que le classement, le podium et les buteurs de
 * `/classements` restaient figés. Et **un redéploiement n'y change rien** — sur
 * Vercel le Data Cache est partagé entre déploiements. Sans cette route, la
 * seule sortie était d'attendre l'heure ou de rouvrir un match au dashboard
 * pour le ré-enregistrer à vide.
 *
 * COÛT (règle n°2)
 * ----------------
 * - Portée : aucune page ne l'appelle. C'est un outil d'exploitation, déclenché
 *   à la main ou en fin de script — quelques appels par journée de championnat.
 * - Fréquence : sans objet, la route n'est pas cachée (POST, `force-dynamic`).
 * - Base : **zéro requête Prisma** sur le chemin par secret. Le chemin par
 *   session lit le rôle depuis le JWT, sans toucher Neon non plus. C'est
 *   délibéré : une route censée réparer la fraîcheur ne doit pas, elle-même,
 *   réveiller le compute.
 * - Défaillance : 401 / 400 / 503 explicites, jamais un 200 muet. Une purge qui
 *   échoue en silence est pire que pas de route du tout, puisqu'on croirait la
 *   page à jour.
 *
 * AUTHENTIFICATION — deux chemins
 * -------------------------------
 * 1. `Authorization: Bearer <REVALIDATE_SECRET>` pour les scripts.
 * 2. Une session **administrateur**, pour pouvoir déclencher depuis le
 *    navigateur sans manipuler de secret.
 *
 * Le rôle vient du JWT, rafraîchi toutes les 15 min (cf. `lib/auth.ts`). Un
 * admin rétrogradé garde donc la main au plus 15 min. Assumé : le pire effet
 * d'un appel indu est une poignée de lectures en base de plus — la route
 * n'expose aucune donnée et n'en modifie aucune.
 *
 * USAGE
 * -----
 *   # toutes les balises
 *   curl -X POST https://www.lrh.re/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET"
 *
 *   # une balise précise
 *   curl -X POST https://www.lrh.re/api/revalidate \
 *     -H "Authorization: Bearer $REVALIDATE_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"tags":["public-competitions"]}'
 *
 * Le secret voyage dans un EN-TÊTE, jamais dans l'URL : une query string se
 * retrouve dans les logs d'accès, l'historique du navigateur et les en-têtes
 * `Referer`.
 */

const VALID_TAGS = Object.values(CACHE_TAGS) as CacheTag[];

/**
 * Comparaison à temps constant. `timingSafeEqual` exige deux buffers de même
 * longueur — on hache donc implicitement via la longueur en la vérifiant
 * d'abord, ce qui ne divulgue que la taille du secret.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    const header = request.headers.get('authorization');
    const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;

    let authorizedBy: 'secret' | 'session';

    if (bearer) {
      const expected = process.env.REVALIDATE_SECRET;
      if (!expected) {
        // On distingue « pas configuré » de « mauvais secret » : ça ne
        // divulgue rien et ça évite de chercher une faute de frappe dans un
        // secret quand la variable manque tout simplement côté Vercel.
        return NextResponse.json(
          {
            error: 'Revalidation par secret non configurée côté serveur.',
            missing: ['REVALIDATE_SECRET'],
          },
          { status: 503 },
        );
      }
      if (!secretMatches(bearer, expected)) {
        return NextResponse.json({ error: 'Secret invalide.' }, { status: 401 });
      }
      authorizedBy = 'secret';
    } else {
      const session = await auth();
      if (session?.user?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Réservé aux administrateurs.' },
          { status: 401 },
        );
      }
      authorizedBy = 'session';
    }

    // Corps optionnel : sans lui, on purge tout. C'est le cas d'usage courant
    // après une saisie de feuille de match, qui touche matchs, classements et
    // buteurs à la fois.
    let tags: CacheTag[] = VALID_TAGS;
    const raw = await request.text();
    if (raw.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'Corps JSON illisible.' }, { status: 400 });
      }
      const asked = (parsed as { tags?: unknown })?.tags;
      if (asked !== undefined && asked !== 'all') {
        if (!Array.isArray(asked) || asked.some((t) => typeof t !== 'string')) {
          return NextResponse.json(
            { error: '`tags` doit être un tableau de chaînes, ou "all".', validTags: VALID_TAGS },
            { status: 400 },
          );
        }
        const unknownTags = asked.filter((t) => !VALID_TAGS.includes(t as CacheTag));
        if (unknownTags.length > 0) {
          // Refus explicite plutôt qu'ignorer en silence : un nom de balise mal
          // orthographié renverrait sinon un 200 sans rien purger, et on
          // croirait la page rafraîchie.
          return NextResponse.json(
            { error: 'Balise inconnue.', unknownTags, validTags: VALID_TAGS },
            { status: 400 },
          );
        }
        tags = asked as CacheTag[];
      }
    }

    revalidatePublic(...tags);

    return NextResponse.json({
      revalidated: tags,
      authorizedBy,
      at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
