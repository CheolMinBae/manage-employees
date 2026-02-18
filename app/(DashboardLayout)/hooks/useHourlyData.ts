'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';

interface EmployeeSchedule {
  userId: string;
  name: string;
  position: string;
  corp: string;
  eid: number | string;
  category: string;
  userType: string;
  hourlyRate: number;
  hourlyStatus: Array<{
    isWorking: boolean;
    workingRatio: number;
    shift: string | null;
    approved: boolean;
  }>;
  hasSchedule: boolean;
}

interface HourlyData {
  hour: number;
  pendingCount: number;
  approvedCount: number;
  budget: number;
  employees: any[];
}

interface HourlyStaffingData {
  date: string;
  hourlyData: HourlyData[];
  employeeSchedules: EmployeeSchedule[];
}

interface UseHourlyDataParams {
  initialDate?: Date;
  isAdmin: boolean;
  userName?: string;
}

/**
 * HourlyStaffingTable의 데이터 패칭, 필터링, 정렬 로직
 */
export function useHourlyData({ initialDate = new Date(), isAdmin, userName }: UseHourlyDataParams) {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [data, setData] = useState<HourlyStaffingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 필터링 상태
  const [nameFilter, setNameFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{
    hour: number | null;
    direction: 'asc' | 'desc' | null;
  }>({ hour: null, direction: null });

  // URL의 ?date=YYYY-MM-DD 동기화
  useEffect(() => {
    const d = searchParams.get('date');
    if (d) {
      const [y, m, da] = d.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m) && !isNaN(da)) {
        const next = new Date(y, m - 1, da);
        if (!isNaN(next.getTime())) {
          setSelectedDate(next);
        }
      }
    }
  }, [searchParams]);

  // 데이터 패칭
  const fetchHourlyData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
      const response = await fetch(`/api/schedules/hourly?date=${dateStr}&includeAdmin=true`, {
        cache: 'no-store',
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching hourly data:', error);
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    fetchHourlyData();
  }, [selectedDate]);

  // 필터링된 직원 데이터
  const filteredEmployees = useMemo(() => {
    return (data?.employeeSchedules || []).filter(employee => {
      if (!isAdmin && employee.name !== userName) return false;
      const nameMatch = employee.name.toLowerCase().includes(nameFilter.toLowerCase());
      const userTypeMatch = userTypeFilter.length === 0 || userTypeFilter.includes(employee.userType);
      const companyMatch = !companyFilter || employee.corp === companyFilter;
      const categoryMatch = categoryFilter.length === 0 || categoryFilter.includes(employee.category);
      return nameMatch && userTypeMatch && companyMatch && categoryMatch;
    });
  }, [data, isAdmin, userName, nameFilter, userTypeFilter, companyFilter, categoryFilter]);

  // 그룹 우선순위: 승인된 직원(0) → 승인 안 된 직원(1) → OFF 직원(2)
  const getEmployeeGroup = (employee: EmployeeSchedule, hour: number) => {
    const status = employee.hourlyStatus?.[hour];
    if (!status?.isWorking || !status?.workingRatio) return 2;
    if (status.approved === true) return 0;
    return 1;
  };

  // 정렬된 직원 데이터
  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      if (!sortConfig.hour || !sortConfig.direction) return 0;
      const aGroup = getEmployeeGroup(a, sortConfig.hour);
      const bGroup = getEmployeeGroup(b, sortConfig.hour);
      if (aGroup !== bGroup) return aGroup - bGroup;
      const aRatio = a.hourlyStatus?.[sortConfig.hour]?.workingRatio || 0;
      const bRatio = b.hourlyStatus?.[sortConfig.hour]?.workingRatio || 0;
      return sortConfig.direction === 'desc' ? (bRatio - aRatio) : (aRatio - bRatio);
    });
  }, [filteredEmployees, sortConfig]);

  // 필터링된 직원 기준 시간대별 재계산
  const filteredHourlyData = useMemo(() => {
    return (data?.hourlyData || []).map(hourData => {
      let pendingCount = 0;
      let approvedCount = 0;
      let budget = 0;
      const workingEmployees: EmployeeSchedule[] = [];

      sortedEmployees.forEach(emp => {
        const status = emp.hourlyStatus?.[hourData.hour];
        if (status?.isWorking && status?.workingRatio) {
          workingEmployees.push(emp);
          if (status.approved === true) approvedCount += status.workingRatio;
          else pendingCount += status.workingRatio;
          // 인건비 = 시급 * 근무 비율
          budget += (emp.hourlyRate || 0) * status.workingRatio;
        }
      });

      return { ...hourData, pendingCount, approvedCount, budget, employees: workingEmployees };
    });
  }, [data, sortedEmployees]);

  // 고유 필터 목록
  const uniqueUserTypes = useMemo(
    () => Array.from(new Set((data?.employeeSchedules || []).map(emp => emp.userType).filter(Boolean))),
    [data]
  );
  const uniqueCompanies = useMemo(
    () => Array.from(new Set((data?.employeeSchedules || []).map(emp => emp.corp).filter(Boolean))),
    [data]
  );
  const uniqueCategories = useMemo(
    () => Array.from(new Set((data?.employeeSchedules || []).map(emp => emp.category).filter(Boolean))),
    [data]
  );

  // 날짜 이동
  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? dayjs(prev).subtract(1, 'day').toDate() : dayjs(prev).add(1, 'day').toDate());
  };

  // 시간 정렬
  const handleHourSort = (hour: number) => {
    setSortConfig(prev => {
      if (prev.hour !== hour) return { hour, direction: 'desc' };
      if (prev.direction === 'desc') return { hour, direction: 'asc' };
      if (prev.direction === 'asc') return { hour: null, direction: null };
      return { hour, direction: 'desc' };
    });
  };

  // 필터 초기화
  const handleClearFilters = () => {
    setNameFilter('');
    setUserTypeFilter([]);
    setCompanyFilter('');
    setCategoryFilter([]);
    setSortConfig({ hour: null, direction: null });
  };

  // 직원 총 근무시간 계산 (순수 함수이므로 useCallback으로 안정화)
  const getEmployeeTotalHours = useCallback((employee: EmployeeSchedule) => {
    const result = (employee.hourlyStatus || []).reduce(
      (acc: { approved: number; pending: number }, status: any) => {
        if (status?.isWorking && status?.workingRatio) {
          if (status.approved === true) acc.approved += status.workingRatio;
          else acc.pending += status.workingRatio;
        }
        return acc;
      },
      { approved: 0, pending: 0 }
    );
    return { approved: result.approved, pending: result.pending, total: result.approved + result.pending };
  }, []);

  return {
    // 데이터
    data,
    selectedDate,
    setSelectedDate,
    loading,
    refreshing,

    // 필터
    nameFilter,
    setNameFilter,
    userTypeFilter,
    setUserTypeFilter,
    companyFilter,
    setCompanyFilter,
    categoryFilter,
    setCategoryFilter,
    uniqueUserTypes,
    uniqueCompanies,
    uniqueCategories,

    // 정렬
    sortConfig,
    handleHourSort,

    // 처리된 데이터
    sortedEmployees,
    filteredHourlyData,

    // 액션
    fetchHourlyData,
    handleDateChange,
    handleClearFilters,
    getEmployeeTotalHours,
  };
}
