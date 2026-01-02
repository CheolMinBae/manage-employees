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

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface SlotForm {
  id: string;
  date: Dayjs | null;
  start: Dayjs | null;
  end: Dayjs | null;
  selectedTemplate?: string;
  isSplit?: boolean;
  splitSessions?: WorkSession[];
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
}

export default function AddShiftDialog({
  open,
  onClose,
  onSave,
  selectedDate,
  userId,
  existingShifts,
  fetchSchedules,
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

  // Check if a time conflicts with existing schedules for a specific date
  const isTimeConflicted = (time: Dayjs, targetDate: string, excludeSlotId?: string) => {
    const schedulesForDate = allExistingSchedules.filter(schedule => 
      schedule.date === targetDate
    );

    // Also check other slot forms being added
    const otherSlotForms = slotForms.filter(slot => 
      slot.id !== excludeSlotId && 
      slot.date?.format('YYYY-MM-DD') === targetDate &&
      slot.start && slot.end
    );

    // Check against existing schedules
    const conflictWithExisting = schedulesForDate.some(schedule => {
      const scheduleStart = dayjs(`${schedule.date} ${schedule.start}`);
      const scheduleEnd = dayjs(`${schedule.date} ${schedule.end}`);
      
      return time.isAfter(scheduleStart) && time.isBefore(scheduleEnd);
    });

    // Check against other slot forms
    const conflictWithOtherSlots = otherSlotForms.some(slot => {
      return time.isAfter(slot.start!) && time.isBefore(slot.end!);
    });

    return conflictWithExisting || conflictWithOtherSlots;
  };

  // Custom shouldDisableTime function
  const shouldDisableTime = (slotId: string) => (time: Dayjs, view: any) => {
    const currentSlot = slotForms.find(slot => slot.id === slotId);
    if (!currentSlot?.date) return false;

    const targetDate = currentSlot.date.format('YYYY-MM-DD');

    if (view === 'hours') {
      // Check if any minute in this hour conflicts
      for (let minute = 0; minute < 60; minute += 15) {
        const testTime = time.minute(minute);
        if (!isTimeConflicted(testTime, targetDate, slotId)) {
          return false; // If any 15-minute slot is available, don't disable the hour
        }
      }
      return true; // All minutes in this hour are conflicted
    } else {
      // For minutes, check the specific time
      return isTimeConflicted(time, targetDate, slotId);
    }
  };

  const handleSlotChange = (id: string, field: keyof Omit<SlotForm, 'id'>, value: Dayjs | null) => {
    setSlotForms((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value, isSplit: false, splitSessions: undefined } : slot))
    );
  };

  // 6시간 이상 근무 시 분할 필요 여부 확인
  const needsSplit = (slot: SlotForm) => {
    if (!slot.start || !slot.end) return false;
    const duration = slot.end.diff(slot.start, 'hour', true);
    return duration >= 6;
  };

  // 자동 분할 처리
  const handleSplitSlot = (id: string) => {
    setSlotForms((prev) =>
      prev.map((slot) => {
        if (slot.id !== id || !slot.start || !slot.end) return slot;
        
        const totalDuration = slot.end.diff(slot.start, 'minute');
        const breakStart = slot.start.add(totalDuration / 2 - 15, 'minute');
        const breakEnd = breakStart.add(30, 'minute');
        
        return {
          ...slot,
          isSplit: true,
          splitSessions: [
            { start: slot.start, end: breakStart },
            { start: breakEnd, end: slot.end }
          ]
        };
      })
    );
  };

  // 분할 취소
  const handleCombineSlot = (id: string) => {
    setSlotForms((prev) =>
      prev.map((slot) => {
        if (slot.id !== id) return slot;
        return { ...slot, isSplit: false, splitSessions: undefined };
      })
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
        start: templateStart ? templateStart.format('HH:mm') : template?.startTime,
        end: templateEnd ? templateEnd.format('HH:mm') : template?.endTime,
        approved: false, // admin이 템플릿으로 생성하면 자동 승인
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

    // 분할된 슬롯과 일반 슬롯을 구분하여 처리
    const allEntries: { date: string; start: string; end: string; userId: string; userType: string }[] = [];
    
    slotForms.forEach((slot) => {
      if (slot.isSplit && slot.splitSessions && slot.splitSessions.length === 2) {
        // 분할된 슬롯: 두 개의 스케줄 생성
        slot.splitSessions.forEach((session) => {
          if (session.start && session.end) {
            allEntries.push({
              date: slot.date?.format('YYYY-MM-DD') ?? '',
              start: session.start.format('HH:mm'),
              end: session.end.format('HH:mm'),
              userId,
              userType: selectedUserType,
            });
          }
        });
      } else {
        // 일반 슬롯
        allEntries.push({
          date: slot.date?.format('YYYY-MM-DD') ?? '',
          start: slot.start?.format('HH:mm') ?? '',
          end: slot.end?.format('HH:mm') ?? '',
          userId,
          userType: selectedUserType,
        });
      }
    });

    await Promise.all(
      allEntries.map((entry) =>
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
                        slotProps={{ textField: { fullWidth: true, error: false } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TimePicker
                        label="End Time"
                        value={slot.end}
                        onChange={(newEnd) => handleSlotChange(slot.id, 'end', newEnd)}
                        slotProps={{ textField: { fullWidth: true, error: false } }}
                      />
                    </Grid>
                  </Grid>
                  
                  {/* 6시간 이상일 때 분할 옵션 표시 */}
                  {needsSplit(slot) && (
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant={slot.isSplit ? "outlined" : "contained"}
                        size="small"
                        onClick={() => slot.isSplit ? handleCombineSlot(slot.id) : handleSplitSlot(slot.id)}
                        fullWidth
                      >
                        {slot.isSplit ? "Combine Sessions (Remove Break)" : "Split Sessions (Add 30min Break)"}
                      </Button>
                      
                      {slot.isSplit && slot.splitSessions && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Split Sessions:
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Session 1: {slot.splitSessions[0]?.start?.format('HH:mm')} - {slot.splitSessions[0]?.end?.format('HH:mm')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Break: {slot.splitSessions[0]?.end?.format('HH:mm')} - {slot.splitSessions[1]?.start?.format('HH:mm')} (30 min)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Session 2: {slot.splitSessions[1]?.start?.format('HH:mm')} - {slot.splitSessions[1]?.end?.format('HH:mm')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
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
