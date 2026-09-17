/**
 * Calendrier des rassemblements jeunes 2026-2027, arrêté par la commission
 * Développement et Fidélisation en séance du 31 août 2026.
 *
 * Idempotent : la clé logique d'un rassemblement est (saison, jour). Relancer
 * le script met à jour la ligne existante au lieu d'en créer une seconde.
 *
 * Ce qui n'est PAS écrit ici, volontairement :
 *   - Les catégories par date. Le compte rendu dit que U11/U13/U15/U18 sont
 *     « respectées » dans la composition des équipes, pas qu'une date est
 *     réservée à une catégorie. Inventer une répartition afficherait une
 *     information fausse ; le champ reste nul et la page publique porte la
 *     mention générale.
 *   - Les lieux non décidés (22/11, 17/01, 14/03). `location: null` fait
 *     afficher « Lieu à confirmer » en clair — c'est une information utile
 *     pour les familles, pas un trou à masquer.
 *
 * Cible explicite : ce script ne charge PAS .env.
 *
 *   # dev
 *   node scripts/jeunes-rassemblements-2026-2027.mjs
 *   # prod
 *   DATABASE_URL=$(grep -oE '^DATABASE_URL=.*' .env.neon | sed 's/^DATABASE_URL=//; s/"//g') \
 *     node scripts/jeunes-rassemblements-2026-2027.mjs
 *
 * `--dry-run` affiche le plan sans rien écrire.
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

/**
 * Minuit heure Réunion (UTC+4) pour un jour donné. Stocker minuit UTC ferait
 * reculer la date d'un jour à l'affichage.
 */
function reunionDay(iso) {
  return new Date(`${iso}T00:00:00+04:00`);
}

const GAZON_6X6 = '6x6 · 2 périodes de 10 min';

/** Les 9 dates du compte rendu, dans l'ordre. */
const GATHERINGS = [
  { date: '2026-09-26', location: 'Le Tampon',     startTime: '09:00', endTime: '16:00', mode: 'GAZON', format: GAZON_6X6 },
  { date: '2026-10-10', location: 'Trois-Bassins', startTime: '09:00', endTime: '16:00', mode: 'GAZON', format: GAZON_6X6 },
  { date: '2026-10-31', location: 'Le Tampon',     startTime: '09:00', endTime: '16:00', mode: 'GAZON', format: GAZON_6X6 },
  {
    date: '2026-11-22',
    location: null,
    startTime: null,
    endTime: null,
    mode: 'GAZON',
    format: 'Match de clôture 5x5',
    notes: 'Programmé après le tournoi adultes — lieu et horaire à confirmer.',
  },
  {
    // Pas de note : le libellé de lieu affiche déjà « Lieu à confirmer », la
    // répéter en dessous ferait doublon à l'écran.
    date: '2027-01-17',
    location: null,
    startTime: '13:00',
    endTime: null,
    mode: 'GAZON',
    format: 'Match 5x5',
  },
  {
    date: '2027-01-30',
    location: 'Saint-Denis',
    startTime: '09:00',
    endTime: '16:00',
    mode: 'SALLE',
    format: GAZON_6X6,
    notes: 'Rassemblement en salle.',
  },
  { date: '2027-02-14', location: 'Trois-Bassins', startTime: '09:00', endTime: '16:00', mode: 'GAZON', format: GAZON_6X6 },
  {
    date: '2027-03-14',
    location: null,
    startTime: '09:00',
    endTime: '16:00',
    mode: 'GAZON',
    format: GAZON_6X6,
    notes: 'Lieu à revoir.',
  },
  { date: '2027-04-17', location: 'Le Tampon',     startTime: '09:00', endTime: '16:00', mode: 'GAZON', format: GAZON_6X6 },
];

async function main() {
  console.log(`Rassemblements jeunes ${SEASON} — ${GATHERINGS.length} dates`);
  console.log(`Base : ${isNeon ? 'NEON (production)' : 'locale (dev)'}${DRY ? ' — DRY RUN' : ''}\n`);

  for (const g of GATHERINGS) {
    const date = reunionDay(g.date);
    const existing = await prisma.youthGathering.findFirst({
      where: { season: SEASON, date },
      select: { id: true },
    });

    const data = {
      season: SEASON,
      date,
      startTime: g.startTime ?? null,
      endTime: g.endTime ?? null,
      location: g.location ?? null,
      mode: g.mode,
      format: g.format ?? null,
      categories: null,
      notes: g.notes ?? null,
      published: true,
    };

    const label = `${g.date}  ${(g.location ?? 'lieu à confirmer').padEnd(16)} ${g.startTime ?? '--:--'}  ${g.format ?? ''}`;

    if (DRY) {
      console.log(`${existing ? 'MAJ ' : 'NEW '} ${label}`);
      continue;
    }

    if (existing) {
      await prisma.youthGathering.update({ where: { id: existing.id }, data });
      console.log(`MAJ  ${label}`);
    } else {
      await prisma.youthGathering.create({ data });
      console.log(`NEW  ${label}`);
    }
  }

  const total = await prisma.youthGathering.count({ where: { season: SEASON } });
  console.log(`\nTotal en base pour ${SEASON} : ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
