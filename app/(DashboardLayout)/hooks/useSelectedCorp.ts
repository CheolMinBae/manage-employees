'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Corporation {
  _id: string;
  name: string;
  description?: string;
  businessDayStartHour?: number;
  businessDayEndHour?: number;
}

/**
 * admin의 managedCorps 기반으로 Corporation 선택 상태를 관리하는 hook.
 * employee는 자신의 corp만 반환.
 */
export function useSelectedCorp() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';

  const [corporations, setCorporations] = useState<Corporation[]>([]);
  const [selectedCorp, setSelectedCorp] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCorporations = async () => {
      try {
        const res = await fetch('/api/corporation');
        if (!res.ok) return;
        const data: Corporation[] = await res.json();
        setCorporations(data);

        if (!session?.user) return;

        if (isAdmin) {
          const managed = session.user.managedCorps || [];
          // managedCorps가 비어있으면 전체 corp 중 첫 번째, 있으면 첫 번째 managed
          if (managed.length > 0) {
            setSelectedCorp(managed[0]);
          } else if (data.length > 0) {
            setSelectedCorp(data[0].name);
          }
        } else {
          // employee는 자신의 corp 고정
          setSelectedCorp(session.user.corp || '');
        }
      } catch (error) {
        console.error('Failed to fetch corporations:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchCorporations();
    }
  }, [session, isAdmin]);

  // admin이 선택할 수 있는 Corp 목록
  const availableCorps = isAdmin
    ? (() => {
        const managed = session?.user?.managedCorps || [];
        if (managed.length > 0) {
          return corporations.filter(c => managed.includes(c.name));
        }
        return corporations;
      })()
    : corporations.filter(c => c.name === session?.user?.corp);

  const handleCorpChange = useCallback((corpName: string) => {
    setSelectedCorp(corpName);
  }, []);

  // 선택된 corp의 상세 정보
  const selectedCorpData = corporations.find(c => c.name === selectedCorp) || null;

  return {
    selectedCorp,
    setSelectedCorp: handleCorpChange,
    availableCorps,
    selectedCorpData,
    loading,
    isAdmin,
  };
}
