import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const p = new PrismaClient({ adapter });

try {
  const before = await p.club.findMany({
    where: { latitude: 0, longitude: 0 },
    select: { id: true, name: true, shortCode: true, city: true },
  });
  console.log(`Clubs avec lat/lon=(0,0) avant fix : ${before.length}`);
  for (const c of before) {
    console.log(`  - ${c.shortCode ?? '?'} ${c.name} (${c.city})`);
  }

  if (before.length > 0) {
    const r = await p.club.updateMany({
      where: { latitude: 0, longitude: 0 },
      data: { latitude: null, longitude: null },
    });
    console.log(`Reset ${r.count} club(s) → null (fallback lookup ville).`);
  } else {
    console.log('Rien à corriger.');
  }
} finally {
  await p.$disconnect();
}
