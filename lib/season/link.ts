import 'server-only';
import { prisma } from '@/lib/prisma';
import { isValidSeason } from '@/lib/utils/season';

/**
 * Résout le `seasonId` correspondant à un libellé de saison, en créant la
 * `Season` si elle n'existe pas encore.
 *
 * ⚠️ À appeler dans **toute** écriture qui pose une colonne `season` — sur
 * Competition, DraftCalendar ou ClubEngagement. Pendant la migration
 * (cf. project_saison_entite_migration), la chaîne et la FK coexistent et
 * doivent rester d'accord.
 *
 * Pourquoi ce fichier existe : le schéma le disait déjà en commentaire, mais
 * personne ne l'avait implémenté. Constat du 2026-08-04 — les trois chemins de
 * création (`competition.ts`, `draftCalendar.ts`, `engagement.ts`) écrivaient
 * la chaîne seule. Toute compétition créée après la migration se retrouvait
 * donc avec `seasonId` NULL, donc **absente des sélecteurs de saison**, qui
 * passent par la relation. Un commentaire n'est pas un garde-fou.
 *
 * Création implicite plutôt que refus : l'admin saisit encore la saison en
 * texte libre dans le formulaire de compétition. Refuser bloquerait une
 * création légitime pour une raison invisible depuis cet écran. La saison
 * créée ici l'est en `PREPARATION` et apparaît immédiatement dans
 * /dashboard/ligue/saisons, où son cycle de vie reste piloté à la main.
 *
 * (Le jour où le formulaire de compétition proposera une liste déroulante de
 * saisons existantes, cette création implicite pourra devenir un refus.)
 */
export async function ensureSeasonId(label: string): Promise<string> {
  const clean = label.trim();
  if (!isValidSeason(clean)) {
    throw new Error(
      `Saison « ${clean} » invalide. Format attendu : AAAA-AAAA avec deux années consécutives.`,
    );
  }

  const existing = await prisma.season.findUnique({
    where: { label: clean },
    select: { id: true },
  });
  if (existing) return existing.id;

  const [a, b] = clean.split('-').map(Number);
  const created = await prisma.season.create({
    data: {
      label: clean,
      // Bornes par défaut septembre → juin, alignées sur lib/utils/season.ts.
      // Ajustables ensuite depuis l'écran d'admin.
      startsAt: new Date(Date.UTC(a, 8, 1)),
      endsAt: new Date(Date.UTC(b, 5, 30, 23, 59, 59)),
      status: 'PREPARATION',
    },
    select: { id: true },
  });
  return created.id;
}
