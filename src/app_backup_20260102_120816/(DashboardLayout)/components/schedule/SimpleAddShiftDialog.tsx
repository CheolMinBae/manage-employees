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

interface UserInfo {
  _id: string;
  name: string;
  userType: string;
  position: string;
}

interface SimpleAddShiftDialogProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Dayjs | null;
  userId: string;
  userName: string;
  fetchSchedules: () => void;
  userInfo?: UserInfo;
}

export default function SimpleAddShiftDialog({
  open,
  onClose,
  selectedDate,
  userId,
  userName,
  fetchSchedules,
  userInfo: externalUserInfo,
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
  
  // 사용자 정보 상태 추가
  const [userInfo, setUserInfo] = useState<UserInfo | null>(externalUserInfo || null);

  // Reset states when dialog opens
  useEffect(() => {
    if (open) {
      setStartTime(null);
      setEndTime(null);
      setUseTemplate(false);
      setSelectedTemplate('');
      
      // 외부에서 사용자 정보가 전달된 경우 설정
      if (externalUserInfo) {
        setUserInfo(externalUserInfo);
      }
    }
  }, [open, externalUserInfo]);

  // Fetch user info (외부에서 userInfo가 전달되지 않은 경우만 실행)
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!userId || externalUserInfo) return; // 외부 정보가 있으면 스킵

      try {
        const response = await fetch(`/api/users?id=${userId}`);
        if (response.ok) {
          const users = await response.json();
          const user = users.find((u: UserInfo) => u._id === userId);
          if (user) {
            setUserInfo(user);
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    if (open && userId && !externalUserInfo) {
      fetchUserInfo();
    }
  }, [open, userId, externalUserInfo]);

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
    if (!selectedTemplate || !selectedDate || !userInfo) return;

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
        userType: userInfo.userType, // userType 추가
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
        userType: userInfo?.userType || 'Barista', // userType 추가 (기본값 보장)
        approved: isAdmin ? true : false, // Admin이 추가하면 자동 승인
      };

      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create schedule');
      }

      fetchSchedules();
      onClose();
    } catch (error) {
      console.error('Error creating schedule:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`스케줄 생성 중 오류가 발생했습니다: ${errorMessage}`);
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
        {/* 사용자 정보 로딩 상태 표시 */}
        {!userInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading user information...
          </Alert>
        )}

        {/* Admin Template Selection */}
        {isAdmin && userInfo && (
          <Box sx={{ mb: 3 }}>
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
        {!useTemplate && userInfo && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Creating schedule for: <strong>{selectedDate?.format('YYYY-MM-DD')}</strong>
              <br />
              User Type: <strong>{userInfo.userType}</strong>
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Template (Optional)</InputLabel>
                  <Select
                    value={selectedTemplate}
                    label="Select Template (Optional)"
                    onChange={(e) => {
                      const templateId = e.target.value;
                      setSelectedTemplate(templateId);
                      
                      if (templateId) {
                        const template = templates.find(t => t._id === templateId);
                        if (template) {
                          // 템플릿 선택 시 시간 자동 설정
                          setStartTime(dayjs(`2023-01-01 ${template.startTime}`));
                          setEndTime(dayjs(`2023-01-01 ${template.endTime}`));
                        }
                      }
                    }}
                  >
                    <MenuItem value="">
                      <em>Manual Time Selection</em>
                    </MenuItem>
                    {templates.map((template) => (
                      <MenuItem key={template._id} value={template._id}>
                        {template.displayName} ({template.startTime} - {template.endTime})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
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
            
            {selectedTemplate && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Template selected: <strong>{templates.find(t => t._id === selectedTemplate)?.displayName}</strong>
                  <br />
                  You can still adjust the times manually if needed.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!isFormValid || !userInfo}
        >
          {useTemplate ? 'Apply Template' : 'Add Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 