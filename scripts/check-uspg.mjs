import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });
try {
  const clubs = await p.club.findMany({
    where: {
      OR: [
        { shortCode: 'USPG' },
        { name: { contains: 'USPG' } },
        { slug: { contains: 'uspg' } },
        { slug: { contains: 'port' } },
        { city: { contains: 'Port' } },
      ],
    },
    select: {
      id: true, name: true, shortCode: true, slug: true,
      city: true, latitude: true, longitude: true, kind: true,
    },
  });
  console.log(JSON.stringify(clubs, null, 2));
} finally {
  await p.$disconnect();
}
