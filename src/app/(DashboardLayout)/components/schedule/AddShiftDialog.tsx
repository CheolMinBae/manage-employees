'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Typography, IconButton
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState } from 'react';

interface SlotForm {
  start: Dayjs | null;
  end: Dayjs | null;
}

interface TimeSlot {
  date: string;
  start: string;
  end: string;
  approved?: boolean;
  _id?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDate: Dayjs | null;
  userId: string | undefined;
  fetchSchedules: () => void;
  scheduleList: TimeSlot[];
}

export default function AddShiftDialog({
  open,
  onClose,
  selectedDate,
  userId,
  fetchSchedules,
  scheduleList,
}: Props) {
  const [slots, setSlots] = useState<SlotForm[]>([{ start: null, end: null }]);

  const handleSlotChange = (index: number, type: 'start' | 'end', value: Dayjs | null) => {
    const updated = [...slots];
    updated[index][type] = value;
    setSlots(updated);
  };

  const addSlot = () => {
    setSlots([...slots, { start: null, end: null }]);
  };

  const removeSlot = (index: number) => {
    const updated = [...slots];
    updated.splice(index, 1);
    setSlots(updated);
  };

  const handleSave = async () => {
    if (!selectedDate || !userId) return;
    const newItems = slots
      .filter(slot => slot.start && slot.end)
      .map(slot => ({
        userId,
        date: selectedDate.format('YYYY-MM-DD'),
        start: slot.start!.format('HH:mm'),
        end: slot.end!.format('HH:mm'),
      }));

    await Promise.all(
      newItems.map(item =>
        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      )
    );

    onClose();
    fetchSchedules();
    setSlots([{ start: null, end: null }]);
  };

  const existing = scheduleList.filter(s =>
    dayjs(s.date).format('YYYY-MM-DD') === selectedDate?.format('YYYY-MM-DD')
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Shifts for {selectedDate?.format('YYYY-MM-DD')}</DialogTitle>
      <DialogContent>
        {existing.length > 0 && (
          <Stack spacing={1} mb={2}>
            <Typography variant="subtitle2" color="text.secondary">Existing Shifts</Typography>
            {existing.map((slot, idx) => (
              <Typography key={idx} variant="body2" color="text.secondary">
                {slot.start} ~ {slot.end} ({slot.approved ? 'Approved' : 'Pending'})
              </Typography>
            ))}
          </Stack>
        )}

        <Stack spacing={2}>
          {slots.map((slot, idx) => (
            <Stack key={idx} direction="row" spacing={2} alignItems="center">
              <TimePicker
                label="Start Time"
                value={slot.start}
                onChange={(newValue) => handleSlotChange(idx, 'start', newValue)}
              />
              <TimePicker
                label="End Time"
                value={slot.end}
                onChange={(newValue) => handleSlotChange(idx, 'end', newValue)}
              />
              <IconButton onClick={() => removeSlot(idx)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          <Button startIcon={<AddIcon />} onClick={addSlot} variant="outlined">Add Slot</Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
