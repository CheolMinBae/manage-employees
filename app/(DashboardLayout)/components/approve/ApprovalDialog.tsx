// components/ApprovalDialog.tsx
'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Typography, Box, Divider, Alert, Tabs, Tab
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

interface Props {
  open: boolean;
  onClose: () => void;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  setStartTime: (val: Dayjs | null) => void;
  setEndTime: (val: Dayjs | null) => void;
  onApprove: (sessions?: WorkSession[], userType?: string) => void;
  onSave?: (sessions?: WorkSession[], userType?: string) => void;
  onDelete?: () => void;
  selectedDate?: string;
  userId?: string;
  currentScheduleId?: string;
  currentUserType?: string;
}

interface WorkSession {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface ExistingSchedule {
  _id: string;
  start: string;
  end: string;
}

interface UserRole {
  _id: string;
  key: string;
  name: string;
  description?: string;
}

const ApprovalDialog = ({
  open, onClose,
  startTime, endTime,
  setStartTime, setEndTime,
  onApprove,
  onSave,
  onDelete,
  selectedDate,
  userId,
  currentScheduleId,
  currentUserType
}: Props) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.position === 'admin';
  const sessionUserType = useMemo(() => (session?.user as any)?.userType || [], [session?.user]);
  const currentUserId = (session?.user as any)?.id;
  
  // Check if current user can approve schedules
  const canApproveSchedule = () => {
    if (isAdmin) return true;
    
    // Check if user has manager role for specific user types
    if (Array.isArray(sessionUserType)) {
      return sessionUserType.some(type => 
        ['manager', 'supervisor', 'team-lead', 'hr'].includes(type.toLowerCase())
      );
    }
    return false;
  };

  const [isSeparated, setIsSeparated] = useState(false);
  const [sessions, setSessions] = useState<WorkSession[]>([
    { start: null, end: null },
    { start: null, end: null }
  ]);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);

  // UserType 탭 관련 상태
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUserType, setSelectedUserType] = useState<string>(currentUserType || '');
  const [allSchedulesByUserType, setAllSchedulesByUserType] = useState<{ [key: string]: any[] }>({});
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [targetUserInfo, setTargetUserInfo] = useState<any>(null);

  // Reset state when dialog opens and fetch existing schedules
  useEffect(() => {
    if (open) {
      // Reset all state when dialog opens
      setIsSeparated(false);
      setSessions([
        { start: null, end: null },
        { start: null, end: null }
      ]);
      setExistingSchedules([]);
      setSelectedUserType(currentUserType || '');

      // Fetch target user info
      const fetchTargetUserInfo = async () => {
        if (!userId) return;
        
        try {
          const response = await fetch(`/api/users?id=${userId}`);
          if (response.ok) {
            const data = await response.json();
            setTargetUserInfo(data);
          }
        } catch (error) {
          console.error('Error fetching target user info:', error);
        }
      };



      // Fetch existing schedules for the selected date and user
      const fetchExistingSchedules = async () => {
        if (!selectedDate || !userId) return;

        try {
          const response = await fetch(`/api/schedules?date=${selectedDate}&userId=${userId}`);
          const data = await response.json();
          
          // Filter out current schedule being edited
          const filtered = data.filter((schedule: any) => 
            schedule._id !== currentScheduleId && schedule.approved
          );
          
          setExistingSchedules(filtered);
        } catch (error) {
          console.error('Error fetching existing schedules:', error);
        }
      };

      // Fetch schedules for all UserTypes
      const fetchAllUserTypeSchedules = async () => {
        if (!selectedDate || userRoles.length === 0) return;
        
        setLoadingSchedules(true);
        try {
          const schedulesByType: { [key: string]: any[] } = {};
          
          // Fetch schedules for each user role
          await Promise.all(
            userRoles.map(async (role) => {
              const response = await fetch(`/api/schedules?userType=${role.key}&date=${selectedDate}`);
              if (response.ok) {
                const data = await response.json();
                schedulesByType[role.key] = data;
              } else {
                schedulesByType[role.key] = [];
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

      fetchTargetUserInfo();
      fetchExistingSchedules();
    }
  }, [open, selectedDate, userId, currentScheduleId, currentUserType]);

  // Fetch user roles when target user info is available
  useEffect(() => {
    const fetchUserRoles = async () => {
      try {
        const response = await fetch('/api/userrole');
        if (response.ok) {
          const data = await response.json();
          
          // Filter roles based on target user's userType (not session user's)
          const targetUserTypes = targetUserInfo?.userType || [];
          const userUserTypes = Array.isArray(targetUserTypes) ? targetUserTypes : [];
          const filteredRoles = data.filter((role: UserRole) => 
            userUserTypes.some((userType: string) => 
              role.name === userType
            )
          );
          
          setUserRoles(filteredRoles);
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
      }
    };

    if (targetUserInfo) {
      fetchUserRoles();
    }
  }, [targetUserInfo]);

  // Fetch all UserType schedules when userRoles are available
  useEffect(() => {
    const fetchAllUserTypeSchedules = async () => {
      if (!selectedDate || userRoles.length === 0) return;
      
      setLoadingSchedules(true);
      try {
        const schedulesByType: { [key: string]: any[] } = {};
        
        // Fetch schedules for each user role
        await Promise.all(
          userRoles.map(async (role) => {
            const response = await fetch(`/api/schedules?userType=${role.name}&date=${selectedDate}`);
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

  // Check if a time conflicts with existing schedules
  const isTimeConflicted = (time: Dayjs) => {
    return existingSchedules.some(schedule => {
      const scheduleStart = dayjs(`${selectedDate} ${schedule.start}`);
      const scheduleEnd = dayjs(`${selectedDate} ${schedule.end}`);
      
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
    if (!startTime || !endTime) return false;
    const duration = endTime.diff(startTime, 'hour', true);
    return duration >= 6;
  };

  // Handle session separation
  const handleSeparate = () => {
    if (!startTime || !endTime) return;

    const totalDuration = endTime.diff(startTime, 'minute');
    const breakStart = startTime.add(totalDuration / 2 - 15, 'minute');
    const breakEnd = breakStart.add(30, 'minute');

    // Set sessions
    setSessions([
      { start: startTime, end: breakStart },
      { start: breakEnd, end: endTime }
    ]);
    setIsSeparated(true);
  };

  // Handle session combination
  const handleCombine = () => {
    setIsSeparated(false);
    setSessions([
      { start: startTime, end: null },
      { start: null, end: null }
    ]);
  };

  // Handle approval
  const handleApprove = () => {
    if (isSeparated) {
      // Approve with separated session information
      onApprove(sessions, selectedUserType);
    } else {
      // Regular approval with single session
      onApprove([{ start: startTime, end: endTime }], selectedUserType);
    }
  };

  // Handle save without approval
  const handleSave = () => {
    if (onSave) {
      if (isSeparated) {
        // Save with separated session information
        onSave(sessions, selectedUserType);
      } else {
        // Regular save with single session
        onSave([{ start: startTime, end: endTime }], selectedUserType);
      }
    }
  };

  // Handle deletion
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  // Show unauthorized message if user cannot approve schedules
  if (!canApproveSchedule()) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Work Time Approval</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1">
              You don't have permission to approve schedules. Only managers, supervisors, team leads, and HR can approve schedules.
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Work Time Approval</DialogTitle>
      <DialogContent>
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

        <Stack spacing={3} mt={1}>
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Total Work Time
            </Typography>
            <Stack direction="row" spacing={2}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={setStartTime}
                shouldDisableTime={shouldDisableTime}
                sx={{ flex: 1 }}
              />
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={setEndTime}
                shouldDisableTime={shouldDisableTime}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Box>

          {existingSchedules.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Existing schedules: {existingSchedules.map(s => `${s.start}-${s.end}`).join(', ')}
              </Typography>
            </Box>
          )}

          {hasMealBreak() && (
            <Box>
              <Button
                variant={isSeparated ? "outlined" : "contained"}
                onClick={isSeparated ? handleCombine : handleSeparate}
                fullWidth
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
        </Stack>

        {/* UserType별 스케줄 표시 */}
        {loadingSchedules ? (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Loading schedules...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 3, height: 800, overflow: 'auto' }}>
                         {userRoles.map((role) => {
               const schedules = allSchedulesByUserType[role.name] || [];
               return (
                 <Box key={role.key} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {role.name} Schedules
                    {selectedDate && ` - ${selectedDate}`}
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
        {onDelete && currentScheduleId && (
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleDelete}
          >
            Delete
          </Button>
        )}
        {onSave && (
          <Button 
            variant="outlined" 
            color="primary"
            onClick={handleSave}
          >
            Save
          </Button>
        )}
        <Button variant="contained" onClick={handleApprove}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalDialog;
