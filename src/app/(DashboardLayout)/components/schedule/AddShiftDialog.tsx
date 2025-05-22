'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Grid,
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Shift</DialogTitle>
      <DialogContent dividers>
        {slotForms.map((slot) => (
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
                  views={['hours', 'minutes']}
                  slotProps={{ textField: { fullWidth: true, error: false } }}
                />
              </Grid>
              <Grid item xs={4}>
                <TimePicker
                  label="End Time"
                  value={slot.end}
                  onChange={(newEnd) => handleSlotChange(slot.id, 'end', newEnd)}
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
          </div>
        ))}

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
