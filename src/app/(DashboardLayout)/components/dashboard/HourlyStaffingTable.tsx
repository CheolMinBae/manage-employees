'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Tooltip, Chip, Stack, IconButton, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, OutlinedInput, Popper, ClickAwayListener,
  Switch, FormControlLabel, Divider, Autocomplete
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useEffect, useState, useRef } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import EditShiftDialog from '../schedule/EditShiftDialog';
import { CALIFORNIA_TIMEZONE } from '@/constants/dateConfig';

interface Employee {
  name: string;
  position: string;
  shift: string;
  userType?: string;
}

interface HourlyData {
  hour: number;
  pendingCount: number;
  approvedCount: number;
  employees: Employee[];
}

interface EmployeeSchedule {
  userId: string;
  name: string;
  position: string;
  corp: string;
  eid: number | string;
  category: string;
  userType: string;
  hourlyStatus: Array<{
    isWorking: boolean;
    workingRatio: number;
    shift: string | null;
    approved: boolean;
  }>;
  hasSchedule: boolean;
}

interface HourlyStaffingData {
  date: string;
  hourlyData: HourlyData[];
  employeeSchedules: EmployeeSchedule[];
}

interface HourlyStaffingTableProps {
  initialDate?: Date;
}

interface ScheduleTemplate {
  _id: string;
  name: string;
  displayName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  order: number;
}

interface TimeSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => void;
  onTemplateConfirm?: (templateId: string) => void;
  employeeName: string;
  selectedHour: number;
  userId: string;
  selectedDate: Date;
}

function TimeSelectionDialog({ 
  open, 
  onClose, 
  onConfirm, 
  onTemplateConfirm, 
  employeeName, 
  selectedHour, 
  userId, 
  selectedDate 
}: TimeSelectionDialogProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';
  const isEmployee = session?.user?.position === 'employee';
  
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // 템플릿 관련 상태
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  useEffect(() => {
    if (open) {
      // 기본값을 선택된 시간으로 설정
      const hourStr = selectedHour.toString().padStart(2, '0');
      setStartTime(`${hourStr}:00`);
      setEndTime(`${(selectedHour + 1).toString().padStart(2, '0')}:00`);
      
      // 템플릿 상태 초기화
      setUseTemplate(false);
      setSelectedTemplate('');
    }
  }, [open, selectedHour]);

  // Fetch templates (admin only)
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!(isAdmin || isEmployee)) return;

      try {
        const response = await fetch('/api/schedule-templates');
        if (response.ok) {
          const data = await response.json();
          const activeTemplates = data.filter((template: ScheduleTemplate) => template.isActive);
          setTemplates(activeTemplates.sort((a: ScheduleTemplate, b: ScheduleTemplate) => a.order - b.order));
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    if (open && (isAdmin || isEmployee)) {
      fetchTemplates();
    }
  }, [open, isAdmin, isEmployee]);

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleTemplateSubmit = async () => {
    if (!selectedTemplate || !onTemplateConfirm) return;

    const template = templates.find(t => t._id === selectedTemplate);
    if (!template) return;

    try {
      // 해당 날짜의 기존 스케줄 삭제
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const existingSchedulesResponse = await fetch(`/api/schedules?userId=${userId}&date=${dateStr}`);
      if (existingSchedulesResponse.ok) {
        const existingSchedules = await existingSchedulesResponse.json();
        
        // 기존 스케줄들 삭제
        await Promise.all(
          existingSchedules.map((schedule: any) =>
            fetch(`/api/schedules?id=${schedule._id}`, {
              method: 'DELETE',
            })
          )
        );
      }

      // 템플릿으로 새 스케줄 생성
      await onConfirm(template.startTime, template.endTime);
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
      alert('템플릿 적용 중 오류가 발생했습니다.');
    }
  };

  const handleConfirm = () => {
    if (useTemplate) {
      handleTemplateSubmit();
      return;
    }

    if (startTime && endTime && startTime < endTime) {
      onConfirm(startTime, endTime);
      onClose();
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const isFormValid = useTemplate ? !!selectedTemplate : (!!startTime && !!endTime && startTime < endTime);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Shift for {employeeName} - {formatHour(selectedHour)}
      </DialogTitle>
      <DialogContent>
        {/* Admin Template Selection */}
        {isAdmin && (
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={useTemplate}
                  onChange={(e) => {
                    setUseTemplate(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedTemplate('');
                    }
                  }}
                />
              }
              label="Force Schedule Templates 사용"
            />
            
            {useTemplate && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>스케줄 템플릿 선택</InputLabel>
                  <Select
                    value={selectedTemplate}
                    label="스케줄 템플릿 선택"
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    {templates.map((template) => (
                      <MenuItem key={template._id} value={template._id}>
                        {template.displayName} ({template.startTime} - {template.endTime})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {selectedTemplate && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Warning:</strong> Applying a template will delete all existing schedules for that date 
                      and replace them with the selected template.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
            
            <Divider sx={{ my: 3 }} />
          </Box>
        )}

        {/* Manual Time Selection (hidden when using template) */}
        {!useTemplate && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField
                select
                label="Start Time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                fullWidth
              >
                {timeOptions.map((time) => (
                  <MenuItem key={time} value={time}>
                    {time}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="End Time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                fullWidth
              >
                {timeOptions.map((time) => (
                  <MenuItem key={time} value={time}>
                    {time}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            {startTime && endTime && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Duration: {startTime} - {endTime}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!isFormValid}
        >
          {useTemplate ? 'Apply Template' : 'Add Shift'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HourlyStaffingTable({ initialDate = new Date() }: HourlyStaffingTableProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [data, setData] = useState<HourlyStaffingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ userId: string; name: string; hour: number } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // 필터링 상태
  const [nameFilter, setNameFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string[]>([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{
    hour: number | null;
    direction: 'asc' | 'desc' | null;
  }>({
    hour: null,
    direction: null
  });

  // 1. Add/Edit Shift Dialog 상태 추가
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogInfo, setEditDialogInfo] = useState<{ employee: EmployeeSchedule; hour: number } | null>(null);
  const [editScheduleData, setEditScheduleData] = useState<any>(null);

  const fetchHourlyData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/schedules/hourly?date=${dateStr}&includeAdmin=true`, {
        cache: 'no-store', // 캐시 무시하여 최신 데이터 가져오기
      });
      const result = await response.json();
      console.log('API Response:', result);
      console.log('Employee schedules sample:', result.employeeSchedules?.slice(0, 2));
      setData(result);
    } catch (error) {
      console.error('Error fetching hourly data:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 필터링된 직원 데이터
  const filteredEmployees = (data?.employeeSchedules || []).filter(employee => {
    const nameMatch = employee.name.toLowerCase().includes(nameFilter.toLowerCase());
    const userTypeMatch = userTypeFilter.length === 0 || userTypeFilter.includes(employee.userType);
    const companyMatch = !companyFilter || employee.corp === companyFilter;
    const categoryMatch = categoryFilter.length === 0 || categoryFilter.includes(employee.category);
    
    return nameMatch && userTypeMatch && companyMatch && categoryMatch;
  });

  // 정렬된 직원 데이터
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig.hour || !sortConfig.direction) return 0;
    
    // hourlyStatus 배열은 0~23시간을 담고 있으므로 직접 hour 값을 인덱스로 사용
    const aWorkingRatio = a.hourlyStatus?.[sortConfig.hour]?.workingRatio || 0;
    const bWorkingRatio = b.hourlyStatus?.[sortConfig.hour]?.workingRatio || 0;
    
    if (sortConfig.direction === 'desc') {
      return bWorkingRatio - aWorkingRatio; // 내림차순 (많이 일하는 순)
    } else {
      return aWorkingRatio - bWorkingRatio; // 오름차순 (적게 일하는 순)
    }
  });

  // 필터링된 직원들을 기준으로 시간대별 근무자 수 재계산 (pending/approved 분리)
  const filteredHourlyData = (data?.hourlyData || []).map(hourData => {
    let pendingCount = 0;
    let approvedCount = 0;
    const workingEmployees: EmployeeSchedule[] = [];
    
    sortedEmployees.forEach(emp => {
      // hourlyStatus 배열은 0~23시간을 담고 있으므로 직접 hourData.hour를 인덱스로 사용
      const status = emp.hourlyStatus?.[hourData.hour];
      if (status?.isWorking && status?.workingRatio) {
        workingEmployees.push(emp);
        if (status.approved === true) {
          approvedCount += status.workingRatio;
        } else {
          pendingCount += status.workingRatio;
        }
      }
    });
    
    return {
      ...hourData,
      pendingCount,
      approvedCount,
      employees: workingEmployees // 실제 근무하는 직원들만 포함
    };
  });

  // 고유한 userType, company, category 목록 생성
  const uniqueUserTypes = Array.from(new Set((data?.employeeSchedules || []).map(emp => emp.userType)));
  const uniqueCompanies = Array.from(new Set((data?.employeeSchedules || []).map(emp => emp.corp)));
  const uniqueCategories = Array.from(new Set((data?.employeeSchedules || []).map(emp => emp.category)));

  const handleClearFilters = () => {
    setNameFilter('');
    setUserTypeFilter([]);
    setCompanyFilter('');
    setCategoryFilter([]);
    setSortConfig({ hour: null, direction: null }); // 정렬도 초기화
  };

  // 시간대별 정렬 핸들러
  const handleHourSort = (hour: number) => {
    setSortConfig(prevConfig => {
      if (prevConfig.hour !== hour) {
        // 다른 시간을 클릭한 경우: 해당 시간으로 내림차순 정렬
        return { hour, direction: 'desc' };
      } else {
        // 같은 시간을 클릭한 경우: 정렬 방향 변경
        if (prevConfig.direction === 'desc') {
          return { hour, direction: 'asc' };
        } else if (prevConfig.direction === 'asc') {
          return { hour: null, direction: null }; // 정렬 취소
        } else {
          return { hour, direction: 'desc' };
        }
      }
    });
  };

  const handleAddSchedule = async (startTime: string, endTime: string) => {
    if (!selectedEmployee) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedEmployee.userId,
          date: dateStr,
          start: startTime,
          end: endTime,
          approved: true, // Admin이 추가하므로 자동 승인
        }),
      });

      if (response.ok) {
        setToastMessage(`${selectedEmployee.name}의 ${startTime}-${endTime} 근무가 등록되었습니다`);
        setToastSeverity('success');
        setToastOpen(true);
        // 데이터 새로고침
        fetchHourlyData(true);
      } else {
        throw new Error('Failed to add schedule');
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      setToastMessage('근무 등록에 실패했습니다');
      setToastSeverity('error');
      setToastOpen(true);
    }
  };

  const handleOpenDialog = (userId: string, hour: number, employeeName: string) => {
    setSelectedEmployee({ userId, name: employeeName, hour });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleCloseToast = () => {
    setToastOpen(false);
  };

  useEffect(() => {
    fetchHourlyData();
  }, [selectedDate]);

  const handleRefresh = () => {
    fetchHourlyData(true);
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const formatDateHeader = (dateStr: string) => {
    // 빈 문자열이나 잘못된 형식 체크
    if (!dateStr || typeof dateStr !== 'string') {
      return 'Invalid Date';
    }

    // 서버에서 전달하는 date 문자열(YYYY-MM-DD)을 직접 파싱하여 시간대 변환 방지
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      return 'Invalid Date';
    }

    const [year, month, day] = parts.map(Number);
    
    // 숫자 변환 실패 체크
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return 'Invalid Date';
    }

    // 날짜 범위 체크
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return 'Invalid Date';
    }

    const date = new Date(year, month - 1, day); // 로컬 시간으로 직접 생성
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return format(date, 'MMM d (EEE)'); // 요일 3글자 추가
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate(prevDate => 
      direction === 'prev' ? subDays(prevDate, 1) : addDays(prevDate, 1)
    );
  };

  const handleDatePickerToggle = () => {
    setDatePickerOpen(!datePickerOpen);
  };

  const handleDatePickerClose = () => {
    setDatePickerOpen(false);
  };

  const handleDateSelect = (newDate: dayjs.Dayjs | null) => {
    if (newDate) {
      setSelectedDate(newDate.toDate());
      setDatePickerOpen(false);
    }
  };

  const renderTooltipContent = (employees: EmployeeSchedule[]) => {
    if (employees.length === 0) {
      return <Typography variant="body2">No employees working</Typography>;
    }

    // User type별 카운트 계산 (userType이 있으면 사용, 없으면 position 사용)
    const userTypeCounts = employees.reduce((acc, emp) => {
      const typeKey = emp.userType || emp.position;
      acc[typeKey] = (acc[typeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Working Staff:
        </Typography>
        <Stack spacing={0.2} sx={{ mb: 2 }}>
          {employees.map((emp, idx) => (
            <Box key={idx}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {emp.name}
              </Typography>
              <Typography variant="caption" color="white">
                {emp.userType || emp.position} • {/* shift 정보는 hourlyStatus에서 추출 */}
                {emp.hourlyStatus && emp.hourlyStatus.filter(h => h.isWorking).map(h => h.shift ? h.shift : '').filter(s => s !== '').join(', ')}
              </Typography>
            </Box>
          ))}
        </Stack>
        {/* User Type별 합계 */}
        <Box sx={{ borderTop: '1px solid #e0e0e0', pt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>
            Summary by Position:
          </Typography>
          <Stack spacing={0.25}>
            {Object.entries(userTypeCounts).map(([position, count]) => (
              <Box key={position} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="white">
                  {position}:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  {count}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', pt: 0.25, mt: 0.25 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                Total:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {employees.length}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    );
  };

  const getCountColor = (count: number) => {
    if (count === 0) return '#9e9e9e';
    if (count <= 2) return '#f44336';
    if (count <= 4) return '#ff9800';
    return '#4caf50';
  };

  // 직원별 전체 시간 합계 계산 함수 (실제 근무 시간만 합산)
  const getEmployeeTotalHours = (employee: EmployeeSchedule): number => {
    return (employee.hourlyStatus || []).reduce((sum: number, status: any) => {
      return sum + (status?.isWorking ? (status?.workingRatio || 0) : 0);
    }, 0);
  };

  // 시간 표시 함수 (서버에서 전달하는 hour 값은 이미 캘리포니아 시간 기준)
  const formatHourCalifornia = (hour: number) => {
    // 서버에서 전달하는 hour는 이미 캘리포니아 시간 기준 3-23시
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Typography variant="h6">
            ⏰ Hourly Staffing
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Typography variant="h6">
            ⏰ Hourly Staffing
          </Typography>
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography>Unable to load data.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 캘리포니아 시간 안내 */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        All times are displayed in California (Pacific Time, America/Los_Angeles) time zone.
      </Typography>
      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <Typography variant="h6">
          ⏰ Hourly Staffing
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton 
            size="small" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              ...(refreshing && {
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': {
                    transform: 'rotate(0deg)',
                  },
                  '100%': {
                    transform: 'rotate(360deg)',
                  },
                },
              }),
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 필터링 UI */}
      <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
          🔍 Filter Employees
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="Name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
            placeholder="Search by name..."
          />
          <Autocomplete
            multiple
            options={uniqueUserTypes}
            value={userTypeFilter}
            onChange={(event, newValue) => setUserTypeFilter(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Position"
                placeholder="search..."
                size="small"
              />
            )}
            sx={{ minWidth: 200 }}
          />
          <TextField
            select
            label="Company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All Companies</MenuItem>
            {uniqueCompanies.map((company) => (
              <MenuItem key={company} value={company}>
                {company}
              </MenuItem>
            ))}
          </TextField>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              multiple
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Category" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {uniqueCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            sx={{ height: 40 }}
          >
            Clear
          </Button>
          <Typography variant="caption" color="text.secondary">
            Showing {filteredEmployees.length} of {(data?.employeeSchedules || []).length} employees
            {sortConfig.hour && (
              <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#1976d2' }}>
                • Sorted by {formatHourCalifornia(sortConfig.hour)} ({sortConfig.direction === 'desc' ? 'Most working first' : 'Least working first'})
              </span>
            )}
          </Typography>
        </Box>
      </Box>
      
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120, position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDateChange('prev')}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>
                  <Box 
                    ref={datePickerRef}
                    sx={{ 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      }
                    }}
                    onClick={handleDatePickerToggle}
                  >
                    <CalendarTodayIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="h6">
                      {formatDateHeader(data?.date || '')}
                    </Typography>
                  </Box>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDateChange('next')}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Date Picker Popper */}
                <Popper 
                  open={datePickerOpen} 
                  anchorEl={datePickerRef.current} 
                  placement="bottom"
                  sx={{ zIndex: 1300 }}
                >
                  <ClickAwayListener onClickAway={handleDatePickerClose}>
                    <Paper sx={{ p: 1, mt: 1 }}>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          value={dayjs(selectedDate)}
                          onChange={handleDateSelect}
                          slotProps={{
                            textField: { size: 'small' },
                            popper: { sx: { zIndex: 1400 } }
                          }}
                        />
                      </LocalizationProvider>
                    </Paper>
                  </ClickAwayListener>
                </Popper>
              </TableCell>
              {(data?.hourlyData || []).map((hourData) => (
                <>
                  {(hourData.hour >= 3 && hourData.hour <= 23) && (
                    <TableCell 
                      key={hourData.hour} 
                      align="center" 
                      sx={{ 
                        minWidth: 40, 
                        px: 0.5,
                        cursor: 'pointer',
                        backgroundColor: sortConfig.hour === hourData.hour 
                          ? (sortConfig.direction === 'desc' ? '#e3f2fd' : '#fff3e0')
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: sortConfig.hour === hourData.hour 
                            ? (sortConfig.direction === 'desc' ? '#bbdefb' : '#ffe0b2')
                            : 'rgba(0, 0, 0, 0.04)'
                        },
                        position: 'relative'
                      }}
                      onClick={() => handleHourSort(hourData.hour)}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {formatHourCalifornia(hourData.hour)}
                      </Typography>
                      {sortConfig.hour === hourData.hour && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontSize: '0.6rem', 
                            display: 'block',
                            color: sortConfig.direction === 'desc' ? '#1976d2' : '#f57c00'
                          }}
                        >
                          {sortConfig.direction === 'desc' ? '↓' : '↑'}
                        </Typography>
                      )}
                    </TableCell>
                  )}
                </>
              ))}
              <TableCell align="center" sx={{ minWidth: 60, px: 0.5 }}>
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  Total
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Total Count Row (pending/approved 분리 표기) */}
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  📊 Total Staff
                </Typography>
              </TableCell>
              {filteredHourlyData.map((hourData) => (
                <>
                  {(hourData.hour >= 3 && hourData.hour <= 23) && (
                    <TableCell key={hourData.hour} align="center" sx={{ px: 0.5, py: 1 }}>
                      <Tooltip
                        title={renderTooltipContent(hourData.employees)}
                        placement="top"
                        arrow
                      >
                        <Box>
                          <>
                            <Typography
                              variant="body2"
                              sx={{ color: '#ff9800', fontWeight: 'bold', lineHeight: 1 }}
                            >
                              {hourData.pendingCount.toFixed(2)}
                            </Typography>
                            <Divider sx={{ my: 0.2 }} />
                            <Typography
                              variant="body2"
                              sx={{ color: '#4caf50', fontWeight: 'bold', lineHeight: 1 }}
                            >
                              {hourData.approvedCount.toFixed(2)}
                            </Typography>
                          </>
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                </>
              ))}
              <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {/* 전체 직원 합계의 합계 */}
                  {sortedEmployees
                    .reduce((sum, emp) => sum + getEmployeeTotalHours(emp), 0)
                    .toFixed(2)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Individual Employee Rows */}
            {sortedEmployees.map((employee) => (
              <TableRow key={employee.userId}>
                <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {employee.name} ({Array.isArray(employee.userType) 
                        ? employee.userType.join(', ') 
                        : String(employee.userType || '')})
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                      <Chip label={employee.corp} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                      <Chip label={`EID: ${employee.eid}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                      <Chip label={employee.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                    </Stack>
                  </Box>
                </TableCell>
                {(data?.hourlyData || []).map((hourData) => {
                  const hour = hourData.hour;
                  if (hour < 3 || hour > 23) return null;
                  const status = employee.hourlyStatus?.[hour];
                  return (
                    <TableCell key={hour} align="center" sx={{ px: 0.5, py: 1 }}>
                      {status?.isWorking ? (
                        <Tooltip title={`Working: ${status.shift}`} placement="top">
                          <Typography
                            variant="caption"
                            sx={{
                              color: status.approved === true ? '#4caf50' : '#ff9800',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              px: 0.5,
                              py: 0.25,
                              borderRadius: 1,
                              '&:hover': {
                                backgroundColor: status.approved === true
                                  ? 'rgba(76, 175, 80, 0.1)'
                                  : 'rgba(255, 152, 0, 0.1)'
                              },
                            }}
                            onClick={async () => {
                              setEditDialogInfo({ employee, hour });
                              
                              // 실제 스케줄 데이터 가져오기
                              try {
                                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                                const response = await fetch(`/api/schedules?userId=${employee.userId}&date=${dateStr}`);
                                if (response.ok) {
                                  const schedules = await response.json();
                                  
                                  // 해당 시간대에 해당하는 스케줄 찾기
                                  const relevantSchedule = schedules.find((schedule: any) => {
                                    const startHour = parseInt(schedule.start.split(':')[0]);
                                    const startMinute = parseInt(schedule.start.split(':')[1]);
                                    const endHour = parseInt(schedule.end.split(':')[0]);
                                    const endMinute = parseInt(schedule.end.split(':')[1]);
                                    
                                    const startTotalMinutes = startHour * 60 + startMinute;
                                    const endTotalMinutes = endHour * 60 + endMinute;
                                    const currentHourStart = hour * 60;
                                    const currentHourEnd = (hour + 1) * 60;
                                    
                                    return startTotalMinutes < currentHourEnd && endTotalMinutes > currentHourStart;
                                  });
                                  
                                  setEditScheduleData(relevantSchedule);
                                }
                              } catch (error) {
                                console.error('Error fetching schedule data:', error);
                              }
                              
                              setEditDialogOpen(true);
                            }}
                          >
                            {status.workingRatio === 1 ? '1.00' : status.workingRatio.toFixed(2)}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Add shift" placement="top">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(employee.userId, hour, employee.name)}
                            sx={{ width: 20, height: 20, color: '#2196f3', '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)', color: '#1976d2' } }}
                          >
                            <AddIcon sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {getEmployeeTotalHours(employee).toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend & Dialog & Toast */}
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Legend:
        </Typography>
        <Chip 
          label="0 staff" 
          size="small" 
          sx={{ backgroundColor: '#9e9e9e', color: 'white', fontSize: '0.7rem' }} 
        />
        <Chip 
          label="1-2 staff" 
          size="small" 
          sx={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.7rem' }} 
        />
        <Chip 
          label="3-4 staff" 
          size="small" 
          sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.7rem' }} 
        />
        <Chip 
          label="5+ staff" 
          size="small" 
          sx={{ backgroundColor: '#4caf50', color: 'white', fontSize: '0.7rem' }} 
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          Individual: 1 = Full hour • 0.x = Partial hour • - = Not working
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          💡 Click hour headers to sort by working hours: 1st click = Most working first, 2nd click = Least working first, 3rd click = Reset
        </Typography>
      </Box>

      {/* Time Selection Dialog */}
      {selectedEmployee && (
        <TimeSelectionDialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          onConfirm={handleAddSchedule}
          employeeName={selectedEmployee.name}
          selectedHour={selectedEmployee.hour}
          userId={selectedEmployee.userId}
          selectedDate={selectedDate}
        />
      )}

      {/* Edit Shift Dialog */}
      {editDialogOpen && editDialogInfo && editScheduleData && (
        <EditShiftDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditScheduleData(null);
          }}
          slot={{
            _id: editScheduleData._id,
            userId: editDialogInfo.employee.userId,
            userType: editDialogInfo.employee.userType,
            start: editScheduleData.start,
            end: editScheduleData.end,
            date: data?.date || '',
            approved: editScheduleData.approved || false,
          }}
          fetchSchedules={fetchHourlyData}
        />
      )}

      {/* Toast Message */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseToast} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}