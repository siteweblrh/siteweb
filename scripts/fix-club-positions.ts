/**
 * Correctif ponctuel : USPG et HCP avaient latitude=0, longitude=0 en DB
 * (saisi par erreur via le form admin qui accepte "0" comme valeur).
 * Avec ces lat/lon explicites, la carte les plaçait à (0,0) géographique
 * (côte africaine, hors carte de La Réunion).
 *
 * On remet ces deux champs à null pour qu'ils retombent sur le fallback
 * `getCityLatLon(club.city)` (centre de la commune).
 *
 * Lancer :   npx ts-node scripts/fix-club-positions.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.club.updateMany({
    where: {
      shortCode: { in: ['USPG', 'HCP'] },
      latitude: 0,
      longitude: 0,
    },
    data: { latitude: null, longitude: null },
  });
  console.log(`✓ Reset lat/lon sur ${result.count} club(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
