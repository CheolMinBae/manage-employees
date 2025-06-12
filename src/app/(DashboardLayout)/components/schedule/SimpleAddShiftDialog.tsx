'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface ScheduleTemplate {
  _id: string;
  name: string;
  displayName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  order: number;
}

interface SimpleAddShiftDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Dayjs | null;
  userId: string;
  userName: string;
  fetchSchedules: () => void;
}

export default function SimpleAddShiftDialog({
  open,
  onClose,
  selectedDate,
  userId,
  userName,
  fetchSchedules,
}: SimpleAddShiftDialogProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';
  const isEmployee = session?.user?.position === 'employee';
  
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  
  // 템플릿 관련 상태
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setStartTime(null);
      setEndTime(null);
      setUseTemplate(false);
      setSelectedTemplate('');
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
        date: selectedDate.format('YYYY-MM-DD'),
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

      fetchSchedules();
      onClose();
    } catch (error) {
      console.error('Error applying template:', error);
      alert('템플릿 적용 중 오류가 발생했습니다.');
    }
  };

  const handleManualSubmit = async () => {
    if (!selectedDate || !startTime || !endTime) return;

    try {
      const newSchedule = {
        userId,
        date: selectedDate.format('YYYY-MM-DD'),
        start: startTime.format('HH:mm'),
        end: endTime.format('HH:mm'),
        approved: isAdmin ? true : false, // Admin이 추가하면 자동 승인
      };

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }

      fetchSchedules();
      onClose();
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('스케줄 생성 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async () => {
    if (useTemplate) {
      await handleTemplateSubmit();
    } else {
      await handleManualSubmit();
    }
  };

  const isFormValid = useTemplate ? !!selectedTemplate : (!!startTime && !!endTime);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add Shift for {userName} - {selectedDate?.format('YYYY-MM-DD')}
      </DialogTitle>
      <DialogContent dividers>
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

        {/* Manual Schedule Input (hidden when using template) */}
        {!useTemplate && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Creating schedule for: <strong>{selectedDate?.format('YYYY-MM-DD')}</strong>
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TimePicker
                  label="Start Time"
                  value={startTime}
                  onChange={setStartTime}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TimePicker
                  label="End Time"
                  value={endTime}
                  onChange={setEndTime}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!isFormValid}
        >
          {useTemplate ? 'Apply Template' : 'Add Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 