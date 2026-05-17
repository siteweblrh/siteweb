import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const clubs = await prisma.club.findMany({
    orderBy: { shortCode: 'asc' },
    select: {
      shortCode: true,
      slug: true,
      name: true,
      city: true,
      latitude: true,
      longitude: true,
      kind: true,
    },
  });
  console.log(JSON.stringify(clubs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
