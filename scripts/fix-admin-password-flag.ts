import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { mustChangePassword: false },
  });
  console.log('Admins mis à jour:', result.count);

  const users = await prisma.user.findMany({
    select: { email: true, role: true, mustChangePassword: true },
  });
  console.log(JSON.stringify(users, null, 2));

  await prisma.$disconnect();
}

main();
