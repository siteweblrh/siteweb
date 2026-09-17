/**
 * Salle 2026-2027 — toutes les journées à venir se jouent au Complexe Gymnase
 * du Guillaume (Saint-Paul).
 *
 * Périmètre retenu, à corriger si ce n'est pas le bon :
 *   - TOUS les matchs de discipline SALLE de la saison 2026-2027, championnat
 *     ET Coupe de la Ligue — une journée de coupe reste une journée salle.
 *   - Uniquement les matchs À VENIR. Les 4 matchs de J1 (06/09) sont FINISHED :
 *     on ne réécrit pas l'histoire, et ils se sont de toute façon déjà joués
 *     au Guillaume.
 *   - PAS le rassemblement jeunes du 30/01/2027 : c'est un rassemblement, pas
 *     une journée de championnat, et il se règle dans /dashboard/ligue/jeunes.
 *
 * `venueId` est posé ET le champ texte libre `venue` est vidé : garder les deux
 * renseignés laisserait deux sources de vérité qui peuvent diverger.
 *
 * Idempotent : relançable, il ne réécrit que ce qui diffère.
 *
 *   # dry-run (aucune écriture)
 *   DATABASE_URL=... node scripts/salle-2026-2027-lieu-guillaume.mjs --dry-run
 *   # prod
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *     node scripts/salle-2026-2027-lieu-guillaume.mjs
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant — cf. en-tête du script.');
const isNeon = new URL(connectionString).hostname.endsWith('.neon.tech');
const prisma = new PrismaClient({
  adapter: isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString }),
});
const DRY = process.argv.includes('--dry-run');

const SEASON = '2026-2027';
const VENUE_NAME = 'Complexe Gymnase du Guillaume';

async function main() {
  const venue = await prisma.venue.findFirst({
    where: { name: VENUE_NAME, supportsSalle: true },
    select: { id: true, name: true, city: true },
  });
  if (!venue) throw new Error(`Terrain « ${VENUE_NAME} » introuvable — vérifier /dashboard/ligue/venues.`);
  console.log(`Cible : ${venue.name} (${venue.city})`);
  console.log(`Base  : ${isNeon ? 'NEON (production)' : 'locale (dev)'}${DRY ? ' — DRY RUN' : ''}\n`);

  const matches = await prisma.match.findMany({
    where: {
      competition: { season: SEASON, mode: 'SALLE' },
      status: { notIn: ['FINISHED', 'CANCELLED'] },
    },
    orderBy: { kickoffAt: 'asc' },
    select: {
      id: true, kickoffAt: true, matchday: true, venue: true, venueId: true,
      venueRef: { select: { name: true } },
      competition: { select: { name: true } },
    },
  });

  let changed = 0;
  for (const m of matches) {
    const avant = m.venueRef?.name ?? m.venue ?? '— aucun —';
    const dejaBon = m.venueId === venue.id && m.venue === null;
    const jour = m.kickoffAt.toISOString().slice(0, 10);
    const ligne = `${jour} J${m.matchday ?? '?'}  ${avant.padEnd(32)} ${m.competition.name}`;

    if (dejaBon) { console.log(`  =    ${ligne}`); continue; }
    changed++;
    if (!DRY) {
      await prisma.match.update({ where: { id: m.id }, data: { venueId: venue.id, venue: null } });
    }
    console.log(`  ${DRY ? 'MAJ?' : 'MAJ '} ${ligne}`);
  }

  console.log(`\n${matches.length} matchs à venir — ${changed} modifié(s), ${matches.length - changed} déjà au Guillaume.`);
  if (!DRY && changed > 0) {
    console.log(
      '\n⚠️ Ce script écrit en base sans invalider le cache public : la page peut\n' +
      "   servir l'ancien lieu jusqu'à 1 h. Pour forcer, rouvrir un match dans\n" +
      '   /dashboard/matches et l\'enregistrer.',
    );
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
