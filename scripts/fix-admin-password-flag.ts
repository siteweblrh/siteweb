import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Admins mustChangePassword = false
  const r1 = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { mustChangePassword: false },
  });
  console.log('Admins mustChangePassword=false:', r1.count);

  // 2. Published articles → APPROVED status
  const r2 = await prisma.news.updateMany({
    where: { published: true, status: 'DRAFT' },
    data: { status: 'APPROVED' },
  });
  console.log('Published news → APPROVED:', r2.count);

  await prisma.$disconnect();
}

main();
