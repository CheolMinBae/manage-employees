'use client';

import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, Typography, Grid, Chip
} from '@mui/material';
import { DateCalendar, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { isSameDay } from 'date-fns';

interface TimeSlot {
  _id?: string;
  start: string;
  end: string;
  approved?: boolean;
  date: string;
  userId: string;
}

interface SlotForm {
  start: Dayjs | null;
  end: Dayjs | null;
}

export default function ScheduleRegisterPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [slots, setSlots] = useState<SlotForm[]>([]);
  const [scheduleList, setScheduleList] = useState<TimeSlot[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [editStart, setEditStart] = useState<Dayjs | null>(null);
  const [editEnd, setEditEnd] = useState<Dayjs | null>(null);

  const userId = session?.user?.id;

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
    setSlots([{ start: null, end: null }]);
    setOpenDialog(true);
  };

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
    const newItems = slots.filter(slot => slot.start && slot.end).map(slot => ({
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

    setOpenDialog(false);
    fetchSchedules();
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  const openEditDialog = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setEditStart(dayjs(`${slot.date}T${slot.start}`));
    setEditEnd(dayjs(`${slot.date}T${slot.end}`));
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingSlot || !editStart || !editEnd) return;

    await fetch('/api/schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingSlot._id,
        start: editStart.format('HH:mm'),
        end: editEnd.format('HH:mm'),
        approved: false,
      }),
    });

    setEditDialogOpen(false);
    setEditingSlot(null);
    fetchSchedules();
  };

  const fetchSchedules = async () => {
    if (!userId) return;
    const res = await fetch('/api/schedules');
    const data: TimeSlot[] = await res.json();
    setScheduleList(data.filter(s => s.userId === userId));
  };

  useEffect(() => {
    fetchSchedules();
  }, [userId]);

  const filteredSchedule = scheduleList.filter(slot =>
    dayjs(slot.date).format('YYYY-MM') === dayjs().format('YYYY-MM')
  );

  const getDayColor = (date: Date) => {
    const match = scheduleList.filter(s => isSameDay(new Date(s.date), date));
    if (match.find(m => m.approved === false)) return '#ed6c02'; // rejected
    if (match.find(m => m.approved === undefined)) return '#ffb300'; // pending
    if (match.find(m => m.approved === true)) return '#2e7d32'; // approved
    return undefined;
  };

  const renderDay = (props: PickersDayProps) => {
    const bgColor = getDayColor(props.day.toDate());
    return (
      <PickersDay
        {...props}
        sx={{
          backgroundColor: bgColor || undefined,
          color: bgColor ? '#fff' : undefined,
          borderRadius: '50%',
        }}
      />
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={4}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" mb={2}>📌 My Shifts This Month</Typography>
            <Stack spacing={1}>
              {filteredSchedule.map((slot, idx) => (
                <Box key={idx} display="flex" alignItems="center" justifyContent="space-between" p={1} border="1px solid #ddd" borderRadius={1}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {dayjs(slot.date).format('MMM D')} {slot.start} ~ {slot.end}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      label={slot.approved ? 'Approved' : 'Pending'}
                      size="small"
                      color={slot.approved ? 'success' : 'warning'}
                    />
                    <IconButton size="small" onClick={() => openEditDialog(slot)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(slot._id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h5" mb={2}>📅 Select a Date to Add Schedule</Typography>
            <DateCalendar value={selectedDate} onChange={handleDateChange} slots={{ day: renderDay }} />
          </Grid>
        </Grid>

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Add Shifts for {selectedDate?.format('YYYY-MM-DD')}
          </DialogTitle>
          <DialogContent>
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
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave}>Save</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Shift</DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TimePicker label="Start Time" value={editStart} onChange={setEditStart} />
              <TimePicker label="End Time" value={editEnd} onChange={setEditEnd} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleEditSave}>Save</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
