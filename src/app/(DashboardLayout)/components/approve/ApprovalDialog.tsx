// components/ApprovalDialog.tsx
'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  Typography, Box, Divider
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  setStartTime: (val: Dayjs | null) => void;
  setEndTime: (val: Dayjs | null) => void;
  onApprove: (sessions?: WorkSession[]) => void;
  onDelete?: () => void;
  selectedDate?: string;
  userId?: string;
  currentScheduleId?: string;
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

const ApprovalDialog = ({
  open, onClose,
  startTime, endTime,
  setStartTime, setEndTime,
  onApprove,
  onDelete,
  selectedDate,
  userId,
  currentScheduleId
}: Props) => {
  const [isSeparated, setIsSeparated] = useState(false);
  const [sessions, setSessions] = useState<WorkSession[]>([
    { start: null, end: null },
    { start: null, end: null }
  ]);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);

  // Fetch existing schedules for the selected date and user
  useEffect(() => {
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

    if (open) {
      fetchExistingSchedules();
    }
  }, [open, selectedDate, userId, currentScheduleId]);

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
      onApprove(sessions);
    } else {
      // Regular approval with single session
      onApprove([{ start: startTime, end: endTime }]);
    }
  };

  // Handle deletion
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Work Time Approval</DialogTitle>
      <DialogContent>
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
        <Button variant="contained" onClick={handleApprove}>
          Approve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApprovalDialog;
