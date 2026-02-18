'use client';

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Paper, Box, Tooltip, Chip, Stack, IconButton, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, OutlinedInput, Popper, ClickAwayListener,
  Switch, FormControlLabel, Divider, Autocomplete, CircularProgress, Backdrop
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
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import EditShiftDialog from '../schedule/EditShiftDialog';
import { useHourlyData } from '../../hooks/useHourlyData';
import { useDragSelection } from '../../hooks/useDragSelection';

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
  hourlyRate: number;
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
  dragEndHour?: number;
  templates: ScheduleTemplate[];
}

// 시간 옵션을 컴포넌트 외부에서 한 번만 생성 (15분 간격, 96개)
const TIME_OPTIONS: string[] = [];
for (let hour = 0; hour < 24; hour++) {
  for (let minute = 0; minute < 60; minute += 15) {
    TIME_OPTIONS.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  }
}

function TimeSelectionDialog({
  open,
  onClose,
  onConfirm,
  onTemplateConfirm,
  employeeName,
  selectedHour,
  userId,
  selectedDate,
  dragEndHour,
  templates
}: TimeSelectionDialogProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    if (open) {
      const startHour = dragEndHour !== undefined 
        ? Math.min(selectedHour, dragEndHour) 
        : selectedHour;
      const endHourValue = dragEndHour !== undefined 
        ? Math.max(selectedHour, dragEndHour) + 1 
        : selectedHour + 1;
      
      const startHourStr = startHour.toString().padStart(2, '0');
      const endHourStr = endHourValue.toString().padStart(2, '0');
      
      setStartTime(`${startHourStr}:00`);
      setEndTime(`${endHourStr}:00`);

      setUseTemplate(false);
      setSelectedTemplate('');
    }
  }, [open, selectedHour, dragEndHour]);

  const timeOptions = TIME_OPTIONS;

  const handleTemplateSubmit = async () => {
    if (!selectedTemplate) return;

    const template = templates.find(t => t._id === selectedTemplate);
    if (!template) return;

    try {
      // 해당 날짜의 기존 스케줄 삭제
      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
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
              <Autocomplete
                options={timeOptions}
                value={startTime || null}
                onChange={(_, newValue) => setStartTime(newValue || '')}
                renderInput={(params) => (
                  <TextField {...params} label="Start Time" />
                )}
                fullWidth
                disableClearable={!!startTime}
              />
              <Autocomplete
                options={timeOptions}
                value={endTime || null}
                onChange={(_, newValue) => setEndTime(newValue || '')}
                renderInput={(params) => (
                  <TextField {...params} label="End Time" />
                )}
                fullWidth
                disableClearable={!!endTime}
              />
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

// 개별 직원 행 — React.memo로 불필요한 리렌더링 방지
const EmployeeRow = React.memo(function EmployeeRow({
  employee, hourlyData, isAdmin, userName, selectedDate,
  isDragSelected, isDragging, handleDragStart, handleDragEnter, handleDragEndAction,
  handleOpenDialog, setEditDialogInfo, setEditScheduleData, setEditDialogOpen,
  setEditLoading, getEmployeeTotalHours, onEditHourlyRate,
}: {
  employee: EmployeeSchedule;
  hourlyData: HourlyData[];
  isAdmin: boolean;
  userName: string | null | undefined;
  selectedDate: Date;
  isDragSelected: (userId: string, hour: number) => boolean;
  isDragging: boolean;
  handleDragStart: (userId: string, hour: number, name: string) => void;
  handleDragEnter: (hour: number) => void;
  handleDragEndAction: () => void;
  handleOpenDialog: (userId: string, hour: number, name: string) => void;
  setEditDialogInfo: (info: { employee: EmployeeSchedule; hour: number }) => void;
  setEditScheduleData: (data: any) => void;
  setEditDialogOpen: (open: boolean) => void;
  setEditLoading: (loading: boolean) => void;
  getEmployeeTotalHours: (emp: EmployeeSchedule) => { pending: number; approved: number };
  onEditHourlyRate?: (employee: EmployeeSchedule) => void;
}) {
  return (
    <TableRow>
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
            <Chip
              label={`$${(employee.hourlyRate || 0).toFixed(2)}/hr`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 16, cursor: isAdmin ? 'pointer' : 'default' }}
              onClick={isAdmin ? () => onEditHourlyRate?.(employee) : undefined}
            />
          </Stack>
        </Box>
      </TableCell>

      {hourlyData.map((hourData) => {
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
                    cursor: (isAdmin || employee.name === userName) ? 'pointer' : 'default',
                    fontSize: '0.75rem',
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 1,
                    '&:hover': (isAdmin || employee.name === userName) ? {
                      backgroundColor: status.approved === true
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'rgba(255, 152, 0, 0.1)'
                    } : {},
                  }}
                  onClick={async () => {
                    if (!isAdmin && employee.name !== userName) return;
                    setEditDialogInfo({ employee, hour });
                    setEditLoading(true);
                    try {
                      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
                      const response = await fetch(`/api/schedules?userId=${employee.userId}&date=${dateStr}`);
                      if (response.ok) {
                        const schedules = await response.json();
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
                        if (relevantSchedule) {
                          setEditScheduleData(relevantSchedule);
                          setEditDialogOpen(true);
                        } else {
                          console.warn('No matching schedule found for this hour');
                        }
                      }
                    } catch (error) {
                      console.error('Error fetching schedule data:', error);
                    } finally {
                      setEditLoading(false);
                    }
                  }}
                >
                  {status.workingRatio === 1 ? '1.00' : status.workingRatio.toFixed(2)}
                </Typography>
              </Tooltip>
            ) : (
              (isAdmin || employee.name === userName) ? (
                <Tooltip title="Drag to select time range or click to add shift" placement="top">
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      minHeight: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backgroundColor: isDragSelected(employee.userId, hour) ? 'rgba(33, 150, 243, 0.3)' : 'transparent',
                      borderRadius: 1,
                      transition: 'background-color 0.1s',
                      userSelect: 'none',
                      '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
                    }}
                    onMouseDown={() => handleDragStart(employee.userId, hour, employee.name)}
                    onMouseEnter={() => handleDragEnter(hour)}
                    onMouseUp={handleDragEndAction}
                    onClick={() => {
                      if (!isDragging) {
                        handleOpenDialog(employee.userId, hour, employee.name);
                      }
                    }}
                  >
                    <AddIcon sx={{ fontSize: '0.8rem', color: '#2196f3' }} />
                  </Box>
                </Tooltip>
              ) : (
                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#ccc' }}>
                  -
                </Typography>
              )
            )}
          </TableCell>
        );
      })}

      <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#ff9800', fontSize: '0.75rem', lineHeight: 1 }}>
            {getEmployeeTotalHours(employee).pending.toFixed(2)}
          </Typography>
          <Divider sx={{ my: 0.1 }} />
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#4caf50', fontSize: '0.75rem', lineHeight: 1 }}>
            {getEmployeeTotalHours(employee).approved.toFixed(2)}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
});

export default function HourlyStaffingTable({ initialDate = new Date() }: HourlyStaffingTableProps) {
  // 세션 정보
  const { data: session } = useSession();
  const userPosition = session?.user?.position;
  const userName = session?.user?.name;
  const isAdmin = userPosition === 'admin';

  // 데이터 패칭/필터링/정렬 hook
  const hourly = useHourlyData({ initialDate, isAdmin, userName: userName ?? undefined });
  const {
    data, selectedDate, setSelectedDate, loading, refreshing,
    nameFilter, setNameFilter, userTypeFilter, setUserTypeFilter,
    companyFilter, setCompanyFilter, categoryFilter, setCategoryFilter,
    uniqueUserTypes, uniqueCompanies, uniqueCategories,
    sortConfig, handleHourSort,
    sortedEmployees, filteredHourlyData,
    fetchHourlyData, handleDateChange, handleClearFilters, getEmployeeTotalHours,
  } = hourly;

  // 필터된 직원 수 (표시용)
  const filteredEmployees = hourly.sortedEmployees;

  // UI 상태
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');
  // Dialog 상태 — 테이블 리렌더링 방지를 위해 별도 state 그룹
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    employee: { userId: string; name: string; hour: number; dragEndHour?: number } | null;
  }>({ open: false, employee: null });

  const datePickerRef = useRef<HTMLDivElement>(null);

  // 템플릿을 한 번만 fetch
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/schedule-templates');
        if (response.ok) {
          const data = await response.json();
          const activeTemplates = data.filter((t: ScheduleTemplate) => t.isActive);
          setTemplates(activeTemplates.sort((a: ScheduleTemplate, b: ScheduleTemplate) => a.order - b.order));
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    if (isAdmin) fetchTemplates();
  }, [isAdmin]);

  // 시급 수정 Dialog 상태
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [rateEditTarget, setRateEditTarget] = useState<EmployeeSchedule | null>(null);
  const [rateEditValue, setRateEditValue] = useState<string>('0');

  const handleEditHourlyRate = useCallback((employee: EmployeeSchedule) => {
    setRateEditTarget(employee);
    setRateEditValue(String(employee.hourlyRate || 0));
    setRateDialogOpen(true);
  }, []);

  const handleSaveHourlyRate = useCallback(async () => {
    if (!rateEditTarget) return;
    try {
      const res = await fetch(`/api/users?id=${rateEditTarget.userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourlyRate: Number(rateEditValue) }),
      });
      if (res.ok) {
        setRateDialogOpen(false);
        fetchHourlyData(true);
        setToastMessage(`${rateEditTarget.name}의 시급이 $${Number(rateEditValue).toFixed(2)}로 변경되었습니다`);
        setToastSeverity('success');
        setToastOpen(true);
      }
    } catch (error) {
      console.error('Error updating hourly rate:', error);
      setToastMessage('시급 변경에 실패했습니다');
      setToastSeverity('error');
      setToastOpen(true);
    }
  }, [rateEditTarget, rateEditValue, fetchHourlyData]);

  // Edit Dialog 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogInfo, setEditDialogInfo] = useState<{ employee: EmployeeSchedule; hour: number } | null>(null);
  const [editScheduleData, setEditScheduleData] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // 드래그 hook
  const drag = useDragSelection((userId, name, startHour, endHour) => {
    setDialogState({ open: true, employee: { userId, name, hour: startHour, dragEndHour: endHour } });
  });
  const { isDragging, handleDragStart, handleDragEnter, handleDragEndAction, isDragSelected } = drag;

  const handleAddSchedule = useCallback(async (startTime: string, endTime: string) => {
    const emp = dialogState.employee;
    if (!emp) return;
    try {
      const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: emp.userId,
          date: dateStr,
          start: startTime,
          end: endTime,
          approved: true,
        }),
      });

      if (response.ok) {
        setToastMessage(`${emp.name}의 ${startTime}-${endTime} 근무가 등록되었습니다`);
        setToastSeverity('success');
        setToastOpen(true);
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
  }, [dialogState.employee, selectedDate, fetchHourlyData]);

  const handleOpenDialog = useCallback((userId: string, hour: number, employeeName: string) => {
    setDialogState({ open: true, employee: { userId, name: employeeName, hour } });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogState({ open: false, employee: null });
  }, []);

  const handleCloseToast = () => setToastOpen(false);

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
    if (!dateStr || typeof dateStr !== 'string') return 'Invalid Date';
    const d = dayjs(dateStr);
    if (!d.isValid()) return 'Invalid Date';
    return d.format('MMM D (ddd)');
  };

  const [datePickerOpenState, setDatePickerOpenState] = useState(false);
  const datePickerAnchorRef = useRef<HTMLDivElement>(null);

  const handleDatePickerToggle = () => {
    setDatePickerOpenState(!datePickerOpenState);
  };

  const handleDatePickerClose = () => {
    setDatePickerOpenState(false);
  };

  const handleDateSelect = (newDate: dayjs.Dayjs | null) => {
    if (newDate) {
      setSelectedDate(newDate.toDate());
      setDatePickerOpenState(false);
    }
  };

  const renderTooltipContent = (employees: EmployeeSchedule[]) => {
    if (employees.length === 0) {
      return <Typography variant="body2">No employees working</Typography>;
    }

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
                {emp.userType || emp.position} • {emp.hourlyStatus && emp.hourlyStatus.filter(h => h.isWorking).map(h => h.shift ? h.shift : '').filter(s => s !== '').join(', ')}
              </Typography>
            </Box>
          ))}
        </Stack>
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

  const formatHourCalifornia = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  if (loading) {
    return (
      <Box id="hourly-section">
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Typography variant="h6">⏰ Hourly Staffing</Typography>
        </Box>
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="40vh" gap={2}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">Loading staffing data...</Typography>
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box id="hourly-section">
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
    <Box id="hourly-section">
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
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }),
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* 필터링 UI - admin에게만 표시 */}
      {isAdmin && (
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
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      label={option}
                      size="small"
                      {...tagProps}
                    />
                  );
                })
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
      )}

      <Box sx={{ position: 'relative' }}>
        {/* 데이터 갱신 중 오버레이 */}
        {refreshing && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 10, borderRadius: 1,
          }}>
            <CircularProgress size={36} />
          </Box>
        )}
      <TableContainer 
        component={Paper}
        onMouseUp={handleDragEndAction}
        onMouseLeave={() => {
          if (isDragging) {
            handleDragEndAction();
          }
        }}
        sx={{ userSelect: 'none' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120, position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                  <IconButton size="small" onClick={() => handleDateChange('prev')} sx={{ p: 0.5 }}>
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
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                    }}
                    onClick={handleDatePickerToggle}
                  >
                    <CalendarTodayIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                    <Typography variant="h6">
                      {formatDateHeader(data?.date || '')}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleDateChange('next')} sx={{ p: 0.5 }}>
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Date Picker Popper */}
                <Popper open={datePickerOpenState} anchorEl={datePickerRef.current} placement="bottom" sx={{ zIndex: 1300 }}>
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
                <React.Fragment key={`header-${hourData.hour}`}>
                  {(hourData.hour >= 3 && hourData.hour <= 23) && (
                    <TableCell
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
                </React.Fragment>
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
                <React.Fragment key={`total-${hourData.hour}`}>
                  {(hourData.hour >= 3 && hourData.hour <= 23) && (
                    <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
                      <Tooltip title={renderTooltipContent(hourData.employees)} placement="top" arrow>
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
                </React.Fragment>
              ))}
              <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: '#ff9800', fontSize: '0.75rem', lineHeight: 1 }}
                  >
                    {sortedEmployees
                      .reduce((sum, emp) => sum + getEmployeeTotalHours(emp).pending, 0)
                      .toFixed(2)}
                  </Typography>
                  <Divider sx={{ my: 0.1 }} />
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    sx={{ color: '#4caf50', fontSize: '0.75rem', lineHeight: 1 }}
                  >
                    {sortedEmployees
                      .reduce((sum, emp) => sum + getEmployeeTotalHours(emp).approved, 0)
                      .toFixed(2)}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>

            {/* Budget Row (시간대별 인건비) */}
            <TableRow sx={{ backgroundColor: '#e8f5e9' }}>
              <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: '#e8f5e9', zIndex: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  💰 Labor Budget
                </Typography>
              </TableCell>
              {filteredHourlyData.map((hourData) => (
                <React.Fragment key={`budget-${hourData.hour}`}>
                  {(hourData.hour >= 3 && hourData.hour <= 23) && (
                    <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: '#1b5e20', fontWeight: 'bold', fontSize: '0.7rem', lineHeight: 1 }}
                      >
                        ${hourData.budget.toFixed(0)}
                      </Typography>
                    </TableCell>
                  )}
                </React.Fragment>
              ))}
              <TableCell align="center" sx={{ px: 0.5, py: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{ color: '#1b5e20', fontSize: '0.75rem', lineHeight: 1 }}
                >
                  ${filteredHourlyData
                    .filter(h => h.hour >= 3 && h.hour <= 23)
                    .reduce((sum, h) => sum + h.budget, 0)
                    .toFixed(2)}
                </Typography>
              </TableCell>
            </TableRow>

            {/* Individual Employee Rows */}
            {sortedEmployees.map((employee) => (
              <EmployeeRow
                key={employee.userId}
                employee={employee}
                hourlyData={data?.hourlyData || []}
                isAdmin={isAdmin}
                userName={userName}
                selectedDate={selectedDate}
                isDragSelected={isDragSelected}
                isDragging={isDragging}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragEndAction={handleDragEndAction}
                handleOpenDialog={handleOpenDialog}
                setEditDialogInfo={setEditDialogInfo}
                setEditScheduleData={setEditScheduleData}
                setEditDialogOpen={setEditDialogOpen}
                setEditLoading={setEditLoading}
                getEmployeeTotalHours={getEmployeeTotalHours}
                onEditHourlyRate={handleEditHourlyRate}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      {/* 숫자 셀 클릭 시 로딩 오버레이 */}
      <Backdrop open={editLoading} sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff' }}>
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* Legend & Dialog & Toast */}
      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Legend:
        </Typography>
        <Chip label="0 staff" size="small" sx={{ backgroundColor: '#9e9e9e', color: 'white', fontSize: '0.7rem' }} />
        <Chip label="1-2 staff" size="small" sx={{ backgroundColor: '#f44336', color: 'white', fontSize: '0.7rem' }} />
        <Chip label="3-4 staff" size="small" sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.7rem' }} />
        <Chip label="5+ staff" size="small" sx={{ backgroundColor: '#4caf50', color: 'white', fontSize: '0.7rem' }} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          Individual: 1 = Full hour • 0.x = Partial hour • - = Not working
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          💡 Click hour headers to sort | 🖱️ Drag empty cells to select time range
        </Typography>
      </Box>

      {/* Time Selection Dialog */}
      <TimeSelectionDialog
        open={dialogState.open}
        onClose={handleCloseDialog}
        onConfirm={handleAddSchedule}
        employeeName={dialogState.employee?.name || ''}
        selectedHour={dialogState.employee?.hour || 0}
        userId={dialogState.employee?.userId || ''}
        selectedDate={selectedDate}
        dragEndHour={dialogState.employee?.dragEndHour}
        templates={templates}
      />

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
            approvedBy: editScheduleData.approvedBy,
            approvedAt: editScheduleData.approvedAt,
          }}
          fetchSchedules={fetchHourlyData}
        />
      )}

      {/* Hourly Rate Edit Dialog */}
      <Dialog open={rateDialogOpen} onClose={() => setRateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>시급 수정 - {rateEditTarget?.name}</DialogTitle>
        <DialogContent>
          <TextField
            label="Hourly Rate ($)"
            type="number"
            value={rateEditValue === '0' ? '' : rateEditValue}
            onChange={(e) => setRateEditValue(e.target.value)}
            onFocus={(e) => { if (e.target.value === '0') setRateEditValue(''); }}
            onBlur={(e) => { if (e.target.value === '') setRateEditValue('0'); }}
            fullWidth
            inputProps={{ min: 0, step: 0.25 }}
            placeholder="0"
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveHourlyRate} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Toast Message */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={setToastOpen.bind(null, false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={setToastOpen.bind(null, false)} severity={toastSeverity} sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
