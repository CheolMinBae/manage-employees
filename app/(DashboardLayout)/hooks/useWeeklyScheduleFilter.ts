import { useState, useMemo } from 'react';

export type FilterType = 'name' | 'corp' | 'category' | 'eid' | 'position';

interface UserSchedule {
  userId: string;
  name: string;
  position: string | string[];
  corp: string;
  eid: number | string;
  category: string;
  shifts: any[];
}

interface UseWeeklyScheduleFilterProps {
  scheduleData: UserSchedule[];
  userPosition?: string | null;
  userName?: string | null;
}

interface UseWeeklyScheduleFilterReturn {
  // States
  filterType: FilterType;
  keyword: string;
  selectedNames: string[];
  selectedPositions: string[];
  trigger: number;
  
  // Computed values
  uniqueNames: string[];
  uniquePositions: string[];
  filteredData: UserSchedule[];
  
  // Handlers
  setFilterType: (type: FilterType) => void;
  setKeyword: (keyword: string) => void;
  setSelectedNames: (names: string[]) => void;
  setSelectedPositions: (positions: string[]) => void;
  handleSearch: () => void;
  handleClear: () => void;
  handleFilterTypeChange: (type: FilterType) => void;
  handleKeywordKeyDown: (e: React.KeyboardEvent) => void;
}

export const useWeeklyScheduleFilter = ({
  scheduleData,
  userPosition,
  userName
}: UseWeeklyScheduleFilterProps): UseWeeklyScheduleFilterReturn => {
  const [filterType, setFilterType] = useState<FilterType>('name');
  const [keyword, setKeyword] = useState('');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [trigger, setTrigger] = useState(0);

  // 고유한 이름 목록 생성
  const uniqueNames = useMemo(() => {
    return Array.from(new Set(scheduleData.map(user => user.name))).sort();
  }, [scheduleData]);

  // 고유한 포지션 목록 생성
  const uniquePositions = useMemo(() => {
    const allPositions = scheduleData.flatMap(user => 
      Array.isArray(user.position) ? user.position : [user.position]
    );
    return Array.from(new Set(allPositions)).filter(Boolean).sort();
  }, [scheduleData]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    const filtered = scheduleData;
    
    // Name 필터의 경우 멀티선택 사용
    if (filterType === 'name') {
      if (selectedNames.length === 0) return filtered;
      return filtered.filter((u) => selectedNames.includes(u.name));
    }
    
    // Position 필터의 경우 멀티선택 사용
    if (filterType === 'position') {
      if (selectedPositions.length === 0) return filtered;
      return filtered.filter((u) => {
        const userPositions = Array.isArray(u.position) ? u.position : [u.position];
        return selectedPositions.some(pos => userPositions.includes(pos));
      });
    }
    
    // 다른 필터의 경우 기존 키워드 검색 사용
    if (!keyword.trim()) return filtered;
    return filtered.filter((u) => {
      const target = String(u[filterType]).toLowerCase();
      return target.includes(keyword.trim().toLowerCase());
    });
  }, [scheduleData, filterType, keyword, selectedNames, selectedPositions, userPosition, userName, trigger]);

  // 핸들러들
  const handleSearch = () => {
    setTrigger((t) => t + 1);
    // Name과 Position 필터가 아닌 경우에만 키워드 검색 실행
    // Name과 Position 필터의 경우 실시간으로 필터링됨
  };

  const handleClear = () => {
    setSelectedNames([]);
    setSelectedPositions([]);
    setKeyword('');
    setTrigger((t) => t + 1);
  };

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    setSelectedNames([]); // 필터 타입 변경 시 선택된 이름들 초기화
    setSelectedPositions([]); // 필터 타입 변경 시 선택된 포지션들 초기화
    setKeyword(''); // 키워드도 초기화
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setTrigger((t) => t + 1);
    }
  };

  return {
    // States
    filterType,
    keyword,
    selectedNames,
    selectedPositions,
    trigger,
    
    // Computed values
    uniqueNames,
    uniquePositions,
    filteredData,
    
    // Handlers
    setFilterType,
    setKeyword,
    setSelectedNames,
    setSelectedPositions,
    handleSearch,
    handleClear,
    handleFilterTypeChange,
    handleKeywordKeyDown,
  };
}; 