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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface SlotForm {
  id: string;
  date: Dayjs | null;
  start: Dayjs | null;
  end: Dayjs | null;
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
  const [slotForms, setSlotForms] = useState<SlotForm[]>([]);
  const [allExistingSchedules, setAllExistingSchedules] = useState<ExistingSchedule[]>([]);

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

    setSlotForms([...existing, empty]);
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
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddSlot = () => {
    if (!selectedDate) return;
    setSlotForms((prev) => [
      ...prev,
      {
        id: uuidv4(),
        date: selectedDate,
        start: null,
        end: null,
      },
    ]);
  };

  const handleRemoveSlot = (id: string) => {
    setSlotForms((prev) => prev.filter((slot) => slot.id !== id));
  };

  const handleSubmit = async () => {
    const formatted = slotForms.map((slot) => ({
      date: slot.date?.format('YYYY-MM-DD') ?? '',
      start: slot.start?.format('HH:mm') ?? '',
      end: slot.end?.format('HH:mm') ?? '',
      userId,
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Shift</DialogTitle>
      <DialogContent dividers>
        {slotForms.map((slot) => {
          const existingForDate = slot.date ? getExistingSchedulesForDate(slot.date.format('YYYY-MM-DD')) : [];
          
          return (
            <div key={slot.id} style={{ marginBottom: '1.5rem' }}>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Grid item xs={12}>
                  <DatePicker
                    label="Date"
                    value={slot.date}
                    onChange={(newDate) => handleSlotChange(slot.id, 'date', newDate)}
                    slotProps={{ textField: { fullWidth: true, error: false } }}
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={4}>
                  <TimePicker
                    label="Start Time"
                    value={slot.start}
                    onChange={(newStart) => handleSlotChange(slot.id, 'start', newStart)}
                    shouldDisableTime={shouldDisableTime(slot.id)}
                    views={['hours', 'minutes']}
                    slotProps={{ textField: { fullWidth: true, error: false } }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TimePicker
                    label="End Time"
                    value={slot.end}
                    onChange={(newEnd) => handleSlotChange(slot.id, 'end', newEnd)}
                    shouldDisableTime={shouldDisableTime(slot.id)}
                    views={['hours', 'minutes']}
                    slotProps={{ textField: { fullWidth: true, error: false } }}
                  />
                </Grid>
                <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton onClick={() => handleRemoveSlot(slot.id)} aria-label="delete">
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
              {existingForDate.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Existing schedules for {slot.date?.format('YYYY-MM-DD')}: {existingForDate.map(s => `${s.start}-${s.end}`).join(', ')}
                  </Typography>
                </Box>
              )}
            </div>
          );
        })}

        <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddSlot} sx={{ mt: 1 }}>
          Add Slot
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
