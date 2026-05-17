import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const comps = await prisma.competition.findMany({
    orderBy: [{ mode: 'asc' }, { name: 'asc' }],
    select: { slug: true, name: true, mode: true, season: true, format: true },
  });
  console.log('Compétitions en DB :');
  for (const c of comps) {
    console.log(`  [${c.mode}] ${c.name} — saison "${c.season}" — slug:${c.slug}`);
  }
  const seasons = [...new Set(comps.map((c) => c.season))];
  console.log('\nSaisons distinctes :', seasons);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
