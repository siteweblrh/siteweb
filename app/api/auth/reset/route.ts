import { NextRequest, NextResponse } from 'next/server';
import argon2 from 'argon2';
import { prisma } from '@/lib/prisma';
import { verifyResetToken, consumeResetToken } from '@/lib/auth/password-reset';

/**
 * POST /api/auth/reset
 * Body : { token: string, password: string }
 *
 * Valide le token, hash le nouveau mot de passe (argon2), update le user,
 * marque le token comme utilisé. Invalide les sessions actives en
 * supprimant les rows de la table Session (l'user devra se reconnecter
 * partout — comportement attendu après reset).
 */
export async function POST(req: NextRequest) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'invalid-token' }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: 'password-too-short', message: 'Le mot de passe doit comporter au moins 8 caractères.' },
      { status: 400 },
    );
  }
  if (password.length > 200) {
    return NextResponse.json({ error: 'password-too-long' }, { status: 400 });
  }

  const userId = await verifyResetToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: 'token-invalid-or-expired', message: 'Ce lien est invalide ou expiré. Demandez-en un nouveau.' },
      { status: 400 },
    );
  }

  try {
    const hash = await argon2.hash(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { password: hash } }),
      // Invalide toutes les sessions actives — force re-login.
      prisma.session.deleteMany({ where: { userId } }),
    ]);
    await consumeResetToken(token);

    return NextResponse.json({
      ok: true,
      message: 'Mot de passe mis à jour. Vous pouvez maintenant vous reconnecter.',
    });
  } catch (err) {
    console.error('[reset password] failure', err);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
