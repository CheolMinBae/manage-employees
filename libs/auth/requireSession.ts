// libs/auth/requireSession.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth';
import { redirect } from 'next/navigation';

export async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/authentication/login');
  }

  return session;
}
