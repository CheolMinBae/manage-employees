// hooks/useProtectedSession.ts
'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useProtectedSession() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/authentication/login');
    }
  }, [status, router]);

  return { session, status };
}
