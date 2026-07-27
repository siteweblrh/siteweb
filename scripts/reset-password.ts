import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import argon2 from 'argon2';

/**
 * Reset d'un mot de passe en direct sur la DB — filet de secours quand le
 * flow /auth/forgot-password n'est pas utilisable (email non reçu, Resend
 * non configuré, compte admin verrouillé).
 *
 * Usage :
 *   npx ts-node scripts/reset-password.ts admin@lrh.re            → diagnostic seul
 *   npx ts-node scripts/reset-password.ts admin@lrh.re 'NouveauMdp!'  → reset
 *
 * Le hash utilise argon2 avec les options par défaut, exactement comme
 * app/api/auth/reset/route.ts — donc compatible avec argon2.verify() côté login.
 */

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email) {
    console.error('Usage: npx ts-node scripts/reset-password.ts <email> [nouveau-mot-de-passe]');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      password: true,
      mustChangePassword: true,
      emailVerified: true,
    },
  });

  if (!user) {
    console.log(`\n❌ Aucun compte avec l'email "${email}".`);
    const all = await prisma.user.findMany({
      select: { email: true, role: true },
      orderBy: { email: 'asc' },
    });
    console.log('\nComptes existants :');
    for (const u of all) console.log(`  - ${u.email}  [${u.role}]`);
    await prisma.$disconnect();
    return;
  }

  console.log('\n=== État du compte ===');
  console.log('  id                 :', user.id);
  console.log('  email              :', user.email);
  console.log('  nom                :', user.name ?? '(vide)');
  console.log('  rôle               :', user.role);
  console.log('  mustChangePassword :', user.mustChangePassword);
  console.log(
    '  password           :',
    user.password ? `présent (${user.password.slice(0, 12)}…)` : '❌ ABSENT — login impossible',
  );

  if (!newPassword) {
    console.log('\nAucun nouveau mot de passe fourni — rien modifié.');
    console.log(`Pour réinitialiser : npx ts-node scripts/reset-password.ts ${email} 'MonNouveauMdp'`);
    await prisma.$disconnect();
    return;
  }

  if (newPassword.length < 8) {
    console.error('\n❌ Le mot de passe doit faire au moins 8 caractères.');
    process.exit(1);
  }

  const hash = await argon2.hash(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hash, mustChangePassword: false },
    }),
    // Invalide les sessions actives, comme le fait /api/auth/reset.
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  // Vérification immédiate : le hash écrit valide bien le mot de passe saisi.
  const check = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  const ok = check?.password ? await argon2.verify(check.password, newPassword) : false;

  console.log(`\n✅ Mot de passe mis à jour pour ${email}.`);
  console.log('   Vérification argon2.verify :', ok ? 'OK' : '❌ ÉCHEC');
  console.log('   mustChangePassword remis à false, sessions actives supprimées.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
