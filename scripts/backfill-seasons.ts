/**
 * Reprise de données — phase 1 de la migration « la saison devient une entité »
 * (2026-08-04). Crée les lignes `Season` à partir des chaînes existantes et
 * renseigne les `seasonId` de Competition, DraftCalendar et ClubEngagement.
 *
 * NE CHANGE AUCUNE LECTURE. Les colonnes `season` (chaîne) restent en place et
 * font toujours foi : ce script est purement additif, donc rejouable et sans
 * effet visible sur le site.
 *
 * Usage (base de dev, celle de `.env`) :
 *   node --import ./scripts/test-resolve.mjs scripts/backfill-seasons.ts
 *
 * Usage (PRODUCTION — jamais implicite, cf. règle n°3) :
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *   node --import ./scripts/test-resolve.mjs scripts/backfill-seasons.ts --confirm-prod
 *
 * Idempotent : les `Season` sont upsertées par `label`, et seuls les `seasonId`
 * encore nuls sont écrits. Rejouer le script ne produit aucun changement.
 */
import { prisma } from '@/lib/prisma';
import { isValidSeason } from '@/lib/utils/season';

/** Mois de début / fin de saison sportive (cf. lib/utils/season.ts). */
const SEASON_START_MONTH = 9; // septembre
const SEASON_END_MONTH = 6; // juin

type Plan = {
  label: string;
  startsAt: Date;
  endsAt: Date;
  status: 'PREPARATION' | 'EN_COURS' | 'TERMINEE';
};

function boundsOf(label: string): { startsAt: Date; endsAt: Date } {
  const [a, b] = label.split('-').map(Number);
  // UTC volontaire : ce sont des bornes de tri et d'affichage, pas des horaires
  // de match. Les horaires réels restent gérés par lib/utils/datetime-reunion.
  return {
    startsAt: new Date(Date.UTC(a, SEASON_START_MONTH - 1, 1, 0, 0, 0)),
    endsAt: new Date(Date.UTC(b, SEASON_END_MONTH - 1, 30, 23, 59, 59)),
  };
}

function isProdUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !/127\.0\.0\.1|localhost/.test(url);
}

async function main() {
  const url = process.env.DATABASE_URL;
  const prod = isProdUrl(url);
  const host = url?.replace(/^.*@/, '').replace(/\/.*$/, '') ?? '(inconnue)';

  console.log(`Base ciblée : ${host}${prod ? '  ⚠️  PRODUCTION' : '  (dev)'}`);
  if (prod && !process.argv.includes('--confirm-prod')) {
    console.error(
      "\nRefus : cette base n'est pas locale et --confirm-prod n'a pas été passé.\n" +
        'Viser la production doit toujours être explicite (règle n°3).',
    );
    process.exitCode = 1;
    return;
  }

  // 1. Recenser les libellés présents dans les trois tables.
  const [comps, drafts, engagements] = await Promise.all([
    prisma.competition.findMany({ select: { season: true }, distinct: ['season'] }),
    prisma.draftCalendar.findMany({ select: { season: true }, distinct: ['season'] }),
    prisma.clubEngagement.findMany({ select: { season: true }, distinct: ['season'] }),
  ]);
  const labels = [
    ...new Set([...comps, ...drafts, ...engagements].map((r) => r.season.trim())),
  ].sort();

  if (labels.length === 0) {
    console.log('Aucune saison à reprendre.');
    return;
  }

  const invalid = labels.filter((l) => !isValidSeason(l));
  if (invalid.length > 0) {
    // On s'arrête plutôt que de créer des saisons bancales : une chaîne hors
    // format signale une saisie libre qu'il faut corriger à la main d'abord.
    console.error(`\nLibellés hors format "AAAA-AAAA" : ${invalid.join(', ')}`);
    console.error('Corriger ces valeurs avant de rejouer le script.');
    process.exitCode = 1;
    return;
  }

  // 2. Statut. Objectif : reproduire EXACTEMENT ce que le site affiche
  //    aujourd'hui, pour que la phase 1 soit invisible. La saison la plus
  //    récente ayant au moins un résultat est celle que le public voit déjà
  //    (cf. getDefaultStandingsSeason) → EN_COURS. Les plus anciennes sont
  //    TERMINEE, les plus récentes PREPARATION.
  const withResults = await prisma.competition.findMany({
    where: { matches: { some: { status: 'FINISHED' } } },
    select: { season: true },
    distinct: ['season'],
    orderBy: { season: 'desc' },
    take: 1,
  });
  const current = withResults[0]?.season ?? labels[labels.length - 1];

  const plans: Plan[] = labels.map((label) => ({
    label,
    ...boundsOf(label),
    status:
      label === current ? 'EN_COURS' : label < current ? 'TERMINEE' : 'PREPARATION',
  }));

  console.log('\nSaisons à créer / mettre à jour :');
  for (const p of plans) {
    console.log(
      `  ${p.label}  ${p.status.padEnd(11)} ${p.startsAt.toISOString().slice(0, 10)} → ${p.endsAt.toISOString().slice(0, 10)}`,
    );
  }

  // 3. Upsert des saisons. `status` n'est PAS écrasé si la ligne existe déjà :
  //    une fois la saison créée, c'est l'admin qui pilote son cycle de vie, pas
  //    ce script — sinon le rejouer annulerait une ouverture de saison faite à
  //    la main.
  const byLabel = new Map<string, string>();
  for (const p of plans) {
    const row = await prisma.season.upsert({
      where: { label: p.label },
      update: { startsAt: p.startsAt, endsAt: p.endsAt },
      create: p,
      select: { id: true, label: true, status: true },
    });
    byLabel.set(row.label, row.id);
  }

  // 4. Renseigner les FK encore nulles, table par table.
  let touched = { competition: 0, draftCalendar: 0, clubEngagement: 0 };
  for (const [label, id] of byLabel) {
    const [c, d, e] = await Promise.all([
      prisma.competition.updateMany({
        where: { season: label, seasonId: null },
        data: { seasonId: id },
      }),
      prisma.draftCalendar.updateMany({
        where: { season: label, seasonId: null },
        data: { seasonId: id },
      }),
      prisma.clubEngagement.updateMany({
        where: { season: label, seasonId: null },
        data: { seasonId: id },
      }),
    ]);
    touched.competition += c.count;
    touched.draftCalendar += d.count;
    touched.clubEngagement += e.count;
  }

  console.log('\nFK renseignées :');
  console.log(`  Competition    ${touched.competition}`);
  console.log(`  DraftCalendar  ${touched.draftCalendar}`);
  console.log(`  ClubEngagement ${touched.clubEngagement}`);

  // 5. Contrôle : plus aucune ligne ne doit rester sans saison.
  const [orphanC, orphanD, orphanE] = await Promise.all([
    prisma.competition.count({ where: { seasonId: null } }),
    prisma.draftCalendar.count({ where: { seasonId: null } }),
    prisma.clubEngagement.count({ where: { seasonId: null } }),
  ]);
  const orphans = orphanC + orphanD + orphanE;
  console.log(
    `\nContrôle — lignes sans seasonId : Competition ${orphanC}, DraftCalendar ${orphanD}, ClubEngagement ${orphanE}`,
  );
  if (orphans > 0) {
    console.error('⚠️  Reprise incomplète, ne pas passer à la phase 2.');
    process.exitCode = 1;
    return;
  }
  console.log('✅ Reprise complète.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
