import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata = {
  title: 'Modifier votre mot de passe',
};

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session) redirect('/auth/login');
  if (!session.user.mustChangePassword) redirect('/dashboard');

  return <ChangePasswordForm userName={session.user.name ?? null} />;
}
