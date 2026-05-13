import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const password = await argon2.hash('admin123');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lrh.re' },
    update: {},
    create: {
      email: 'admin@lrh.re',
      name: 'Super Admin',
      password: password,
      role: 'ADMIN',
    },
  });

  console.log({ admin });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
