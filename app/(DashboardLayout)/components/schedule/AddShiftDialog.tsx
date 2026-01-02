'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Grid,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';

interface SlotForm {
  id: string;
  date: Dayjs | null;
  start: Dayjs | null;
  end: Dayjs | null;
  selectedTemplate?: string;
}

interface ExistingShift {
  date: string;
  start: string;
  end: string;
  userId: string;
}

interface ExistingSchedule {
  _id: string;
  start: string;
  end: string;
  date: string;
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

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

interface AddShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (slots: { date: string; start: string; end: string }[]) => void;
  selectedDate: Dayjs | null;
  userId: string;
  existingShifts: ExistingShift[];
  fetchSchedules: () => void;

  // ✅ 회사별 영업시간 (Page에서 내려줌)
  businessDayStartHour?: number; // ex) 8
  businessDayEndHour?: number;   // ex) 28 (다음날 4시)
}

export default function AddShiftDialog({
  open,
  onClose,
  onSave,
  selectedDate,
  userId,
  existingShifts,
  fetchSchedules,

  // ✅ default (값 없으면 안전하게)
  businessDayStartHour = 8,
  businessDayEndHour = 24,
}: AddShiftDialogProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';
  const isEmployee = session?.user?.position === 'employee';
  const currentUserType = useMemo(() => (session?.user as any)?.userType || [], [session?.user]);
  const currentUserId = (session?.user as any)?.id;

  // Check if current user can add schedules for the target user
  const canAddSchedule = () => {
    if (isAdmin) return true;
    if (currentUserId === userId) return true;

    // Check if user has manager role for specific user types
    if (Array.isArray(currentUserType)) {
      return currentUserType.some(type =>
        ['manager', 'supervisor', 'team-lead'].includes(type.toLowerCase())
      );
    }
    return false;
  };

  const [slotForms, setSlotForms] = useState<SlotForm[]>([]);
  const [allExistingSchedules, setAllExistingSchedules] = useState<ExistingSchedule[]>([]);

  // 템플릿 관련 상태
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [templateStart, setTemplateStart] = useState<Dayjs | null>(null);
  const [templateEnd, setTemplateEnd] = useState<Dayjs | null>(null);

  // UserType 탭 관련 상태
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [allSchedulesByUserType, setAllSchedulesByUserType] = useState<{ [key: string]: any[] }>({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // =========================
  // ✅ Business Day Helpers
  // =========================
  const startM = businessDayStartHour * 60; // ex) 8 * 60
  const endM = businessDayEndHour * 60;     // ex) 28 * 60

  const toBusinessMinute = (hour: number, minute: number) => {
    let m = hour * 60 + minute;
    // 영업 시작 이전 시간(새벽)은 다음날로 넘김
    if (m < startM) m += 1440;
    return m;
  };

  // 시작시간: end 경계는 포함하면 안됨 (예: 04:00 시작은 불가)
  const isAllowedStart = (hour: number, minute: number) => {
    const m = toBusinessMinute(hour, minute);
    return m >= startM && m < endM;
  };

  // 종료시간: end 경계 포함 가능 (예: 04:00 종료는 가능)
  const isAllowedEnd = (hour: number, minute: number) => {
    const m = toBusinessMinute(hour, minute);
    return m >= startM && m <= endM;
  };

  const normalizeToBusinessDateTime = (date: Dayjs, hour: number, minute: number) => {
    let dt = date.startOf('day').hour(hour).minute(minute).second(0).millisecond(0);
    const m = hour * 60 + minute;
    if (m < startM) dt = dt.add(1, 'day');
    return dt;
  };

  const parseHM = (hm: string) => {
    const [hStr, mStr] = hm.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
  };

  const businessHoursLabel = () => {
    // 예: 8 ~ 28 => 08:00~04:00
    const endDisplay = businessDayEndHour > 24 ? businessDayEndHour - 24 : businessDayEndHour;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(businessDayStartHour)}:00 ~ ${pad(endDisplay)}:00`;
  };

  // TimePicker shouldDisableTime (Start/End 분리)
  const makeShouldDisableTime =
    (slotId: string, kind: 'start' | 'end') =>
    (value: number, view: 'hours' | 'minutes' | 'seconds') => {
      const slot = slotForms.find(s => s.id === slotId);

      if (view === 'hours') {
        // hours view에서는 minute=0 기준으로 판단 (경계시간 처리 포함)
        const hour = value;
        return kind === 'start'
          ? !isAllowedStart(hour, 0)
          : !isAllowedEnd(hour, 0);
      }

      if (view === 'minutes') {
        const minute = value;
        const hour =
          kind === 'start'
            ? (slot?.start?.hour() ?? 0)
            : (slot?.end?.hour() ?? 0);

        return kind === 'start'
          ? !isAllowedStart(hour, minute)
          : !isAllowedEnd(hour, minute);
      }

      return false;
    };

  // =========================
  // Init slot forms
  // =========================
  useEffect(() => {
    if (!selectedDate) return;
    const existing = existingShifts.map((slot) => ({
      id: uuidv4(),
      date: dayjs(slot.date),
      start: dayjs(`${slot.date} ${slot.start}`),
      end: dayjs(`${slot.date} ${slot.end}`),
    }));

    const empty = {
      id: uuidv4(),
      date: selectedDate,
      start: null,
      end: null,
    };

    setSlotForms([empty]);
  }, [selectedDate, existingShifts]);

  // Fetch all existing schedules for the user
  useEffect(() => {
    const fetchAllExistingSchedules = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/schedules?userId=${userId}`);
        const data = await response.json();

        // Filter approved schedules
        const filtered = data.filter((schedule: any) => schedule.approved);
        setAllExistingSchedules(filtered);
      } catch (error) {
        console.error('Error fetching existing schedules:', error);
      }
    };

    if (open) {
      fetchAllExistingSchedules();
    }
  }, [open, userId]);

  // Reset template states when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTemplate('');
      setTemplateStart(null);
      setTemplateEnd(null);
    }
  }, [open]);

  // Fetch templates (based on user permissions)
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!canAddSchedule()) return;

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

    if (open && canAddSchedule()) {
      fetchTemplates();
    }
  }, [open]);

  // Fetch user roles
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const response = await fetch('/api/userrole');
        if (response.ok) {
          const data = await response.json();

          // Filter roles based on current user's userType
          const userUserTypes = Array.isArray(currentUserType) ? currentUserType : [];
          console.log('Full session:', session);
          console.log('session.user:', session?.user);
          console.log('currentUserType:', currentUserType);
          console.log('userUserTypes:', userUserTypes);

          const filteredRoles = data.filter((role: UserRole) =>
            userUserTypes.some(userType =>
              role.key.toLowerCase() === userType.toLowerCase()
            )
          );

          setUserRoles(filteredRoles);
          if (filteredRoles.length > 0 && !selectedUserType) {
            setSelectedUserType(filteredRoles[0].key);
          }
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    if (open) {
      fetchUserRoles();
    }
  }, [open, currentUserType]);

  // Fetch schedules for all UserTypes
  useEffect(() => {
    const fetchAllUserTypeSchedules = async () => {
      if (!selectedDate || userRoles.length === 0) return;

      setLoadingSchedules(true);
      try {
        const schedulesByType: { [key: string]: any[] } = {};

        // Fetch schedules for each user role
        await Promise.all(
          userRoles.map(async (role) => {
            const response = await fetch(`/api/schedules?userType=${role.name}&date=${selectedDate.format('YYYY-MM-DD')}`);
            if (response.ok) {
              const data = await response.json();
              schedulesByType[role.name] = data;
            } else {
              schedulesByType[role.name] = [];
            }
          })
        );

        setAllSchedulesByUserType(schedulesByType);
      } catch (error) {
        console.error('Error fetching userType schedules:', error);
      } finally {
        setLoadingSchedules(false);
      }
    };

    if (open && selectedDate && userRoles.length > 0) {
      fetchAllUserTypeSchedules();
    }
  }, [open, selectedDate, userRoles]);

  // 템플릿 선택 시 시간 세팅
  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t._id === selectedTemplate);
      if (template) {
        setTemplateStart(dayjs(`2023-01-01 ${template.startTime}`));
        setTemplateEnd(dayjs(`2023-01-01 ${template.endTime}`));
      }
    }
  }, [selectedTemplate, templates]);

  const handleSlotChange = (id: string, field: keyof Omit<SlotForm, 'id'>, value: Dayjs | null) => {
    setSlotForms((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddSlot = () => {
    setSlotForms((prev) => [
      ...prev,
      {
        id: uuidv4(),
        date: selectedDate,
        start: null,
        end: null,
        selectedTemplate: '',
      },
    ]);
  };

  const handleRemoveSlot = (id: string) => {
    setSlotForms((prev) => prev.filter((slot) => slot.id !== id));
  };

  const handleTemplateSubmit = async () => {
    if (!selectedTemplate || !selectedDate) return;

    const template = templates.find(t => t._id === selectedTemplate);
    if (!template) return;

    // ✅ 템플릿 시간 유효성(영업시간/순서) 검증
    const startStr = templateStart ? templateStart.format('HH:mm') : template.startTime;
    const endStr = templateEnd ? templateEnd.format('HH:mm') : template.endTime;

    const { h: sh, m: sm } = parseHM(startStr);
    const { h: eh, m: em } = parseHM(endStr);

    if (!isAllowedStart(sh, sm)) {
      alert(`Start time must be within business hours. (${businessHoursLabel()})`);
      return;
    }
    if (!isAllowedEnd(eh, em)) {
      alert(`End time must be within business hours. (${businessHoursLabel()})`);
      return;
    }

    const sDT = normalizeToBusinessDateTime(selectedDate, sh, sm);
    const eDT = normalizeToBusinessDateTime(selectedDate, eh, em);

    if (!eDT.isAfter(sDT)) {
      alert('End time must be after start time.');
      return;
    }

    try {
      // 1. 해당 날짜의 기존 스케줄 삭제
      const existingSchedulesResponse = await fetch(`/api/schedules?userId=${userId}&date=${selectedDate.format('YYYY-MM-DD')}`);
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

      // 2. 템플릿으로 새 스케줄 생성
      const newSchedule = {
        userId,
        userType: selectedUserType,
        date: selectedDate.format('YYYY-MM-DD'),
        start: startStr,
        end: endStr,
        approved: false, // admin이 템플릿으로 생성하면 자동 승인 (주석은 기존 그대로)
      };

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule from template');
      }

      fetchSchedules();
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
      alert('템플릿 적용 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (useTemplate) {
      await handleTemplateSubmit();
      return;
    }

    // ✅ 수동 입력 유효성 검증(영업시간/순서)
    for (const slot of slotForms) {
      if (!slot.date || !slot.start || !slot.end) {
        alert('Please select Date / Start Time / End Time.');
        return;
      }

      const sh = slot.start.hour();
      const sm = slot.start.minute();
      const eh = slot.end.hour();
      const em = slot.end.minute();

      if (!isAllowedStart(sh, sm)) {
        alert(`Start time must be within business hours. (${businessHoursLabel()})`);
        return;
      }
      if (!isAllowedEnd(eh, em)) {
        alert(`End time must be within business hours. (${businessHoursLabel()})`);
        return;
      }

      const sDT = normalizeToBusinessDateTime(slot.date, sh, sm);
      const eDT = normalizeToBusinessDateTime(slot.date, eh, em);

      if (!eDT.isAfter(sDT)) {
        alert('End time must be after start time.');
        return;
      }
    }

    const formatted = slotForms.map((slot) => ({
      date: slot.date?.format('YYYY-MM-DD') ?? '',
      start: slot.start?.format('HH:mm') ?? '',
      end: slot.end?.format('HH:mm') ?? '',
      userId,
      userType: selectedUserType,
    }));

    await Promise.all(
      formatted.map((entry) =>
        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
      )
    );

    fetchSchedules();
    onClose();
  };

  const getExistingSchedulesForDate = (date: string) => {
    return allExistingSchedules.filter(schedule => schedule.date === date);
  };

  // Show unauthorized message if user cannot add schedules
  if (!canAddSchedule()) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Add Shift</DialogTitle>
        <DialogContent dividers>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1">
              You don't have permission to add schedules for this user.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Shift</DialogTitle>
      <DialogContent dividers>
        {/* UserType Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={selectedUserType}
            onChange={(e, newValue) => setSelectedUserType(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {userRoles.map((role) => (
              <Tab
                key={role._id}
                label={role.name}
                value={role.key}
              />
            ))}
          </Tabs>
        </Box>

        {/* Admin Template Selection */}
        {/* Manual Schedule Input (hidden when using template) */}
        {!useTemplate && (
          <Box>
            {slotForms.map((slot) => {
              const existingForDate = [];
              return (
                <div key={slot.id} style={{ marginBottom: '1.5rem' }}>
                  <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
                    <Grid item xs={4}>
                      <DatePicker
                        label="Date"
                        value={slot.date}
                        onChange={(newDate) => handleSlotChange(slot.id, 'date', newDate)}
                        slotProps={{ textField: { fullWidth: true, error: false } }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <FormControl fullWidth>
                        <InputLabel>Template</InputLabel>
                        <Select
                          value={slot.selectedTemplate || ''}
                          label="Template"
                          onChange={(e) => {
                            const templateId = e.target.value;
                            const template = templates.find(t => t._id === templateId);
                            setSlotForms((prev) =>
                              prev.map((s) =>
                                s.id === slot.id
                                  ? {
                                      ...s,
                                      selectedTemplate: templateId,
                                      start: template ? dayjs(`2023-01-01 ${template.startTime}`) : null,
                                      end: template ? dayjs(`2023-01-01 ${template.endTime}`) : null,
                                    }
                                  : s
                              )
                            );
                          }}
                        >
                          {templates.map((template) => (
                            <MenuItem key={template._id} value={template._id}>
                              {template.displayName} ({template.startTime} - {template.endTime})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconButton onClick={() => handleRemoveSlot(slot.id)} aria-label="delete">
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={6}>
                      <TimePicker
                        label="Start Time"
                        value={slot.start}
                        onChange={(newStart) => handleSlotChange(slot.id, 'start', newStart)}
                        // ✅ 회사별 영업시간 적용 (Start)
                        shouldDisableTime={makeShouldDisableTime(slot.id, 'start')}
                        slotProps={{ textField: { fullWidth: true, error: false } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TimePicker
                        label="End Time"
                        value={slot.end}
                        onChange={(newEnd) => handleSlotChange(slot.id, 'end', newEnd)}
                        // ✅ 회사별 영업시간 적용 (End)
                        shouldDisableTime={makeShouldDisableTime(slot.id, 'end')}
                        slotProps={{ textField: { fullWidth: true, error: false } }}
                      />
                    </Grid>
                  </Grid>

                  {/* {existingForDate.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Existing schedules for {slot.date?.format('YYYY-MM-DD')}: {existingForDate.map(s => `${s.start}-${s.end}`).join(', ')}
                      </Typography>
                    </Box>
                  )} */}
                </div>
              );
            })}
          </Box>
        )}

        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddSlot} sx={{ mt: 1 }}>
          Add Slot
        </Button>

        {/* UserType별 스케줄 표시 */}
        {loadingSchedules ? (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Loading schedules...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 3 }}>
            {userRoles.map((role) => {
              const schedules = allSchedulesByUserType[role.name] || [];
              return (
                <Box key={role.key} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {role.name} Schedules
                    {selectedDate && ` - ${selectedDate.format('YYYY-MM-DD')}`}
                  </Typography>

                  {schedules.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {schedules.map((schedule: any, index: number) => (
                        <Box
                          key={schedule._id || index}
                          sx={{
                            p: 1,
                            bgcolor: schedule.approved ? 'success.light' : 'warning.light',
                            color: '#000',
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography variant="caption">
                            {schedule.start}-{schedule.end}
                            {schedule.approved ? ' ✓' : ' ⏳'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No schedules found for this user type.
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={useTemplate && !selectedTemplate}
        >
          {useTemplate ? 'Apply Template' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
