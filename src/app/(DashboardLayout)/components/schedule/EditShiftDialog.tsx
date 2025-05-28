'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, Box
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

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
  const [editStart, setEditStart] = useState<Dayjs | null>(null);
  const [editEnd, setEditEnd] = useState<Dayjs | null>(null);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);

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

  const handleEditSave = async () => {
    if (!slot || !editStart || !editEnd) return;

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

    onClose();
    fetchSchedules();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Shift</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TimePicker
            label="Start Time"
            value={editStart}
            onChange={setEditStart}
            shouldDisableTime={shouldDisableTime}
          />
          <TimePicker
            label="End Time"
            value={editEnd}
            onChange={setEditEnd}
            shouldDisableTime={shouldDisableTime}
          />
          {existingSchedules.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Existing schedules: {existingSchedules.map(s => `${s.start}-${s.end}`).join(', ')}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleEditSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
