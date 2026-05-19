import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/auth/password-reset';
import { sendEmail, buildResetEmail } from '@/lib/auth/email';
import { SITE_URL } from '@/app/layout';

/**
 * POST /api/auth/forgot-password
 * Body : { email: string }
 *
 * Renvoie TOUJOURS 200 avec un message générique, même si l'email
 * n'existe pas. Cela évite l'énumération de comptes (un attaquant ne
 * peut pas savoir si un email est valide ou non en testant).
 *
 * Rate-limiting laissé au front-end + protection CSRF côté NextAuth
 * (cookies same-site). À durcir avec un middleware si abus.
 */
export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'invalid-email' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null;

  // Lookup discret. Si pas d'user, on simule quand même le délai pour
  // ne pas leak via timing.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (user) {
    try {
      const token = await createPasswordResetToken(user.id, ip);
      const resetUrl = `${SITE_URL}/auth/reset/${encodeURIComponent(token)}`;
      const { subject, html, text } = buildResetEmail({ resetUrl, expiresInMinutes: 60 });
      await sendEmail({ to: email, subject, html, text });
    } catch (err) {
      console.error('[forgot-password] error', err);
      // Pas de leak via réponse — on renvoie 200 quand même.
    }
  } else {
    // Délai pour matcher le timing du cas user trouvé (lookup DB).
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return NextResponse.json({
    ok: true,
    message:
      "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte mail (et vos spams).",
  });
}
