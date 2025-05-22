'use client';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

interface TimeSlot {
  _id?: string;
  date: string;
  start: string;
  end: string;
  approved?: boolean;
  userId: string;
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

  useEffect(() => {
    if (slot) {
      setEditStart(dayjs(`${slot.date}T${slot.start}`));
      setEditEnd(dayjs(`${slot.date}T${slot.end}`));
    }
  }, [slot]);

  const handleEditSave = async () => {
    if (!slot || !editStart || !editEnd) return;

    await fetch('/api/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: slot._id,
        start: editStart.format('HH:mm'),
        end: editEnd.format('HH:mm'),
        approved: false,
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
          />
          <TimePicker
            label="End Time"
            value={editEnd}
            onChange={setEditEnd}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleEditSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
