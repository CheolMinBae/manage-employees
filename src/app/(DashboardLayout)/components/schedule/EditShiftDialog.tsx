'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box, Chip, IconButton, Alert,
  Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface TimeSlot {
  _id: string;
  date: string;
  start: string;
  end: string;
  approved?: boolean;
  userId: string;
}

interface ExistingSchedule {
  _id: string;
  start: string;
  end: string;
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

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  slot: TimeSlot | null;
  fetchSchedules: () => void;
}

export default function EditShiftDialog({
  open,
  onClose,
  slot,
  fetchSchedules,
}: Props) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';
  const isEmployee = session?.user?.position === 'employee';
  
  const [editStart, setEditStart] = useState<Dayjs | null>(null);
  const [editEnd, setEditEnd] = useState<Dayjs | null>(null);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 템플릿 관련 상태
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  
  // Split Sessions 관련 상태
  const [isSeparated, setIsSeparated] = useState(false);
  const [sessions, setSessions] = useState<WorkSession[]>([
    { start: null, end: null },
    { start: null, end: null }
  ]);

  useEffect(() => {
    if (slot) {
      setEditStart(dayjs(`${slot.date}T${slot.start}`));
      setEditEnd(dayjs(`${slot.date}T${slot.end}`));
    }
  }, [slot]);

  // Fetch existing schedules for the selected date and user
  useEffect(() => {
    const fetchExistingSchedules = async () => {
      if (!slot?.date || !slot?.userId) return;

      try {
        const response = await fetch(`/api/schedules?date=${slot.date}&userId=${slot.userId}`);
        const data = await response.json();
        
        // Filter out current schedule being edited
        const filtered = data.filter((schedule: any) => 
          schedule._id !== slot._id && schedule.approved
        );
        
        setExistingSchedules(filtered);
      } catch (error) {
        console.error('Error fetching existing schedules:', error);
      }
    };

    if (open && slot) {
      fetchExistingSchedules();
    }
  }, [open, slot]);

  // Reset template states and split sessions when dialog opens
  useEffect(() => {
    if (open) {
      setUseTemplate(false);
      setSelectedTemplate('');
      setIsSeparated(false);
      setSessions([
        { start: null, end: null },
        { start: null, end: null }
      ]);
    }
  }, [open]);

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

  // Check if a time conflicts with existing schedules
  const isTimeConflicted = (time: Dayjs) => {
    return existingSchedules.some(schedule => {
      const scheduleStart = dayjs(`${slot?.date} ${schedule.start}`);
      const scheduleEnd = dayjs(`${slot?.date} ${schedule.end}`);
      
      return time.isAfter(scheduleStart) && time.isBefore(scheduleEnd);
    });
  };

  // Custom shouldDisableTime function
  const shouldDisableTime = (time: Dayjs, view: any) => {
    if (view === 'hours') {
      // Check if any minute in this hour conflicts
      for (let minute = 0; minute < 60; minute += 15) {
        const testTime = time.minute(minute);
        if (!isTimeConflicted(testTime)) {
          return false; // If any 15-minute slot is available, don't disable the hour
        }
      }
      return true; // All minutes in this hour are conflicted
    } else {
      // For minutes, check the specific time
      return isTimeConflicted(time);
    }
  };

  // Check if work duration is 6 hours or more
  const hasMealBreak = () => {
    if (!editStart || !editEnd) return false;
    const duration = editEnd.diff(editStart, 'hour', true);
    return duration >= 6;
  };

  // Handle session separation
  const handleSeparate = () => {
    if (!editStart || !editEnd) return;

    const totalDuration = editEnd.diff(editStart, 'minute');
    const breakStart = editStart.add(totalDuration / 2 - 15, 'minute');
    const breakEnd = breakStart.add(30, 'minute');

    // Set sessions
    setSessions([
      { start: editStart, end: breakStart },
      { start: breakEnd, end: editEnd }
    ]);
    setIsSeparated(true);
  };

  // Handle session combination
  const handleCombine = () => {
    setIsSeparated(false);
    setSessions([
      { start: editStart, end: null },
      { start: null, end: null }
    ]);
  };

  const handleTemplateSubmit = async () => {
    if (!selectedTemplate || !slot) return;

    const template = templates.find(t => t._id === selectedTemplate);
    if (!template) return;

    setLoading(true);
    try {
      // 1. 해당 날짜의 모든 기존 스케줄 삭제
      const existingSchedulesResponse = await fetch(`/api/schedules?userId=${slot.userId}&date=${slot.date}`);
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
        userId: slot.userId,
        date: slot.date,
        start: template.startTime,
        end: template.endTime,
        approved: true, // admin이 템플릿으로 생성하면 자동 승인
      };

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule from template');
      }

      onClose();
      fetchSchedules();
    } catch (error) {
      console.error('Error applying template:', error);
      alert('템플릿 적용 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (useTemplate) {
      await handleTemplateSubmit();
      return;
    }

    if (!slot || !editStart || !editEnd) return;

    setLoading(true);
    try {
      if (isSeparated && sessions.length === 2) {
        // Handle separated sessions - delete original and create two new ones
        const firstSession = sessions[0];
        const secondSession = sessions[1];

        // Delete the original schedule
        await fetch(`/api/schedules?id=${slot._id}`, {
          method: 'DELETE',
        });

        // Create two new schedules
        const firstSchedule = {
          userId: slot.userId,
          date: slot.date,
          start: firstSession.start?.format('HH:mm'),
          end: firstSession.end?.format('HH:mm'),
          approved: slot.approved || false
        };

        const secondSchedule = {
          userId: slot.userId,
          date: slot.date,
          start: secondSession.start?.format('HH:mm'),
          end: secondSession.end?.format('HH:mm'),
          approved: slot.approved || false
        };

        await Promise.all([
          fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(firstSchedule),
          }),
          fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(secondSchedule),
          })
        ]);
      } else {
        // Handle single session - update existing schedule
        await fetch('/api/schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: slot._id,
            start: editStart.format('HH:mm'),
            end: editEnd.format('HH:mm'),
            approved: slot.approved || false,
          }),
        });
      }

      onClose();
      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCurrentSchedule = async () => {
    if (!slot) return;

    if (!confirm('Are you sure you want to delete this schedule?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?id=${slot._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onClose();
        fetchSchedules();
      } else {
        throw new Error('Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExistingSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this existing schedule?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?id=${scheduleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh existing schedules
        setExistingSchedules(prev => prev.filter(s => s._id !== scheduleId));
        fetchSchedules();
      } else {
        throw new Error('Failed to delete existing schedule');
      }
    } catch (error) {
      console.error('Error deleting existing schedule:', error);
      alert('Failed to delete existing schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeOff = async () => {
    if (!slot) return;

    if (!confirm(`Are you sure you want to delete ALL schedules for ${slot.date}? This will make the day OFF.`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/schedules?userId=${slot.userId}&date=${slot.date}&deleteAll=true`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message || 'All schedules deleted successfully');
        onClose();
        fetchSchedules();
      } else {
        throw new Error('Failed to delete all schedules');
      }
    } catch (error) {
      console.error('Error deleting all schedules:', error);
      alert('Failed to delete all schedules');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Shift</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Editing schedule for {slot?.date}
          </Alert>

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

          {/* Manual Edit (hidden when using template) */}
          {!useTemplate && (
            <>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Work Time
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TimePicker
                    label="Start Time"
                    value={editStart}
                    onChange={setEditStart}
                    shouldDisableTime={shouldDisableTime}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  />
                  <TimePicker
                    label="End Time"
                    value={editEnd}
                    onChange={setEditEnd}
                    shouldDisableTime={shouldDisableTime}
                    disabled={loading}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>

              {hasMealBreak() && (
                <Box>
                  <Button
                    variant={isSeparated ? "outlined" : "contained"}
                    onClick={isSeparated ? handleCombine : handleSeparate}
                    fullWidth
                    disabled={loading}
                  >
                    {isSeparated ? "Combine Sessions" : "Split Sessions"}
                  </Button>
                </Box>
              )}

              {isSeparated && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      First Session
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <TimePicker
                        label="Start"
                        value={sessions[0].start}
                        disabled
                        sx={{ flex: 1 }}
                      />
                      <TimePicker
                        label="End"
                        value={sessions[0].end}
                        disabled
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Second Session
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <TimePicker
                        label="Start"
                        value={sessions[1].start}
                        disabled
                        sx={{ flex: 1 }}
                      />
                      <TimePicker
                        label="End"
                        value={sessions[1].end}
                        disabled
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                  </Box>
                </>
              )}

          {existingSchedules.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Other schedules on this day:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {existingSchedules.map((schedule) => (
                  <Chip
                    key={schedule._id}
                    label={`${schedule.start}-${schedule.end}`}
                    variant="outlined"
                    size="small"
                    deleteIcon={<DeleteIcon />}
                    onDelete={() => handleDeleteExistingSchedule(schedule._id)}
                    disabled={loading}
                  />
                ))}
              </Stack>
            </Box>
          )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Stack direction="row" spacing={1} width="100%" justifyContent="space-between">
          <Box>
            <Button 
              onClick={handleMakeOff} 
              color="error" 
              variant="outlined"
              disabled={loading}
            >
              Make OFF
            </Button>
          </Box>
          <Box display="flex" gap={1}>
            <Button 
              onClick={handleDeleteCurrentSchedule} 
              color="error"
              disabled={loading}
            >
              Delete
            </Button>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleEditSave}
              disabled={loading || (useTemplate && !selectedTemplate)}
            >
              {useTemplate ? 'Apply Template' : 'Save'}
            </Button>
          </Box>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
