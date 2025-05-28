'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Tooltip, Chip, Stack, IconButton, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useEffect, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';

interface Employee {
  name: string;
  position: string;
  shift: string;
}

interface HourlyData {
  hour: number;
  count: number;
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

interface TimeSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (startTime: string, endTime: string) => void;
  employeeName: string;
  selectedHour: number;
}

function TimeSelectionDialog({ open, onClose, onConfirm, employeeName, selectedHour }: TimeSelectionDialogProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (open) {
      // 기본값을 선택된 시간으로 설정
      const hourStr = selectedHour.toString().padStart(2, '0');
      setStartTime(`${hourStr}:00`);
      setEndTime(`${(selectedHour + 1).toString().padStart(2, '0')}:00`);
    }
  }, [open, selectedHour]);

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

  const handleConfirm = () => {
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Shift for {employeeName} - {formatHour(selectedHour)}
      </DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!startTime || !endTime || startTime >= endTime}
        >
          Add Shift
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
  
  // 필터링 상태
  const [nameFilter, setNameFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const fetchHourlyData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/schedules/hourly?date=${dateStr}`, {
        cache: 'no-store', // 캐시 무시하여 최신 데이터 가져오기
      });
      const result = await response.json();
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
  const filteredEmployees = data?.employeeSchedules.filter(employee => {
    const nameMatch = employee.name.toLowerCase().includes(nameFilter.toLowerCase());
    const userTypeMatch = !userTypeFilter || employee.userType === userTypeFilter;
    const companyMatch = !companyFilter || employee.corp === companyFilter;
    
    return nameMatch && userTypeMatch && companyMatch;
  }) || [];

  // 필터링된 직원들을 기준으로 시간대별 근무자 수 재계산
  const filteredHourlyData = data?.hourlyData.map(hourData => {
    const filteredEmployeesAtHour = hourData.employees.filter(emp => 
      filteredEmployees.some(filteredEmp => filteredEmp.name === emp.name)
    );
    
    return {
      ...hourData,
      count: filteredEmployeesAtHour.length,
      employees: filteredEmployeesAtHour
    };
  }) || [];

  // 고유한 userType과 company 목록 생성
  const uniqueUserTypes = Array.from(new Set(data?.employeeSchedules.map(emp => emp.userType) || []));
  const uniqueCompanies = Array.from(new Set(data?.employeeSchedules.map(emp => emp.corp) || []));

  const handleClearFilters = () => {
    setNameFilter('');
    setUserTypeFilter('');
    setCompanyFilter('');
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
    const date = new Date(dateStr);
    return format(date, 'MMM d');
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    setSelectedDate(prevDate => 
      direction === 'prev' ? subDays(prevDate, 1) : addDays(prevDate, 1)
    );
  };

  const renderTooltipContent = (employees: Employee[]) => {
    if (employees.length === 0) {
      return <Typography variant="body2">No employees working</Typography>;
    }

    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Working Staff:
        </Typography>
        <Stack spacing={0.5}>
          {employees.map((emp, idx) => (
            <Box key={idx}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {emp.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {emp.position} • {emp.shift}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const getCountColor = (count: number) => {
    if (count === 0) return '#9e9e9e';
    if (count <= 2) return '#f44336';
    if (count <= 4) return '#ff9800';
    return '#4caf50';
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
          <TextField
            select
            label="User Type"
            value={userTypeFilter}
            onChange={(e) => setUserTypeFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Types</MenuItem>
            {uniqueUserTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
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
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            sx={{ height: 40 }}
          >
            Clear
          </Button>
          <Typography variant="caption" color="text.secondary">
            Showing {filteredEmployees.length} of {data?.employeeSchedules.length || 0} employees
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
                  <Typography variant="h6">
                    {formatDateHeader(data.date)}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDateChange('next')}
                    sx={{ p: 0.5 }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
              {data.hourlyData.map((hourData) => (
                <TableCell key={hourData.hour} align="center" sx={{ minWidth: 40, px: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                    {formatHour(hourData.hour)}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Total Count Row */}
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  📊 Total Staff
                </Typography>
              </TableCell>
              {filteredHourlyData.map((hourData) => (
                <TableCell key={hourData.hour} align="center" sx={{ px: 0.5, py: 1 }}>
                  <Tooltip
                    title={renderTooltipContent(hourData.employees)}
                    placement="top"
                    arrow
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: getCountColor(hourData.count),
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          borderRadius: 1,
                        },
                        px: 0.5,
                        py: 0.25,
                      }}
                    >
                      {hourData.count || ''}
                    </Typography>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>

            {/* Individual Employee Rows */}
            {filteredEmployees.map((employee) => (
              <TableRow key={employee.userId}>
                <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {employee.name} ({employee.userType})
                    </Typography>
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                      <Chip label={employee.corp} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                      <Chip label={`EID: ${employee.eid}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                      <Chip label={employee.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                    </Stack>
                  </Box>
                </TableCell>
                {employee.hourlyStatus.map((status, hour) => (
                  <TableCell key={hour} align="center" sx={{ px: 0.5, py: 1 }}>
                    {status.isWorking ? (
                      <Tooltip title={`Working: ${status.shift}`} placement="top">
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#4caf50',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            '&:hover': {
                              backgroundColor: 'rgba(76, 175, 80, 0.1)',
                              borderRadius: 1,
                            },
                            px: 0.5,
                            py: 0.25,
                          }}
                        >
                          {status.workingRatio === 1 ? '1' : status.workingRatio.toFixed(1)}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Tooltip title={`Add shift for ${employee.name} at ${formatHour(hour)}`} placement="top">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(employee.userId, hour, employee.name)}
                          sx={{
                            width: 20,
                            height: 20,
                            color: '#2196f3',
                            '&:hover': {
                              backgroundColor: 'rgba(33, 150, 243, 0.1)',
                              color: '#1976d2',
                            },
                          }}
                        >
                          <AddIcon sx={{ fontSize: '0.8rem' }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          Individual: 1 = Full hour • 0.x = Partial hour • + = Add shift
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