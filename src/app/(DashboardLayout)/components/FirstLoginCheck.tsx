'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

export default function FirstLoginCheck() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkFirstLogin = async () => {
      if (status === 'authenticated' && session?.user?.email) {
        // 이미 비밀번호 변경 페이지에 있다면 체크하지 않음
        if (pathname.includes('/authentication/change-password')) {
          return;
        }

        try {
          const response = await fetch(`/api/auth/check-first-login?email=${encodeURIComponent(session.user.email)}`);
          const data = await response.json();

          if (response.ok && data.isFirstLogin) {
            router.push('/authentication/change-password?firstLogin=true');
          }
        } catch (error) {
          console.error('Failed to check first login status:', error);
        }
      }
    };

    checkFirstLogin();
  }, [session, status, router, pathname]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
} 