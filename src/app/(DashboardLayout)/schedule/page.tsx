'use client';

import {
  Box, Grid, Typography, IconButton, Dialog, DialogTitle,
  DialogActions, DialogContent, Button
} from '@mui/material';
import { DateCalendar, PickersDay, PickersDayProps } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths,
  subMonths, format, isSameMonth, isSameDay, addDays, isAfter, parseISO
} from 'date-fns';

import AddShiftDialog from '@/app/(DashboardLayout)/components/schedule/AddShiftDialog';
import EditShiftDialog from '@/app/(DashboardLayout)/components/schedule/EditShiftDialog';
import ShiftList from '@/app/(DashboardLayout)/components/schedule/ShiftList';

interface TimeSlot {
  _id?: string;
  start: string;
  end: string;
  approved?: boolean;
  date: string;
  userId: string;
}

interface WeekRange {
  start: Date;
  end: Date;
}

export default function ScheduleRegisterPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [scheduleList, setScheduleList] = useState<TimeSlot[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargetWeek, setCopyTargetWeek] = useState<WeekRange | null>(null);
  const [shiftsForSelectedDate, setShiftsForSelectedDate] = useState<TimeSlot[]>([]);

  const userId = session?.user?.id as string;

  const handleMonthChange = (dir: 'prev' | 'next') => {
    const newMonth = dir === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1);
    if (dir === 'next' && isAfter(newMonth, new Date())) return;
    setCurrentMonth(newMonth);
  };

  const getWeeksInMonth = (monthStart: Date): WeekRange[] => {
    const weeks: WeekRange[] = [];
    let start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
    const monthEnd = endOfMonth(monthStart);

    while (start <= monthEnd) {
      const end = endOfWeek(start, { weekStartsOn: 0 });
      weeks.push({ start, end });
      start = addDays(start, 7);
    }
    return weeks;
  };

  const handleDateChange = (date: Dayjs | null) => {
    if (!date) return;
    setSelectedDate(date);
    setOpenDialog(true);

    const dateStr = date.format('YYYY-MM-DD');
    const shifts = scheduleList.filter((s) => s.date === dateStr && s.userId === userId);
    setShiftsForSelectedDate(shifts);
  };

  const openEditDialog = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
    fetchSchedules();
  };

  const fetchSchedules = async () => {
    if (!userId) return;
    const res = await fetch('/api/schedules');
    const data: TimeSlot[] = await res.json();
    setScheduleList(data.filter((s) => s.userId === userId));
  };

  useEffect(() => {
    fetchSchedules();
  }, [userId]);

  const weeks = getWeeksInMonth(currentMonth);

  const handleCopyWeek = (week: WeekRange) => {
    setCopyTargetWeek(week);
    setCopyDialogOpen(true);
  };

  const confirmCopyWeek = async () => {
    if (!copyTargetWeek || !userId) return;

    const today = new Date();
    const targetWeekStart = startOfWeek(today, { weekStartsOn: 0 });

    const sourceWeek = scheduleList.filter((s) => {
      const date = parseISO(s.date);
      return isSameDay(startOfWeek(date, { weekStartsOn: 0 }), copyTargetWeek.start);
    });

    const existing = scheduleList.filter((s) =>
      isSameDay(startOfWeek(parseISO(s.date), { weekStartsOn: 0 }), targetWeekStart)
    );

    const newItems = sourceWeek
      .map((s) => {
        const date = parseISO(s.date);
        const diff = date.getDay();
        const newDate = addDays(targetWeekStart, diff);
        return {
          userId,
          date: format(newDate, 'yyyy-MM-dd'),
          start: s.start,
          end: s.end,
        };
      })
      .filter((item) => {
        return !existing.some(
          (e) =>
            e.date === item.date &&
            ((e.start <= item.start && item.start < e.end) ||
              (e.start < item.end && item.end <= e.end))
        );
      });

    await Promise.all(
      newItems.map((item) =>
        fetch('/api/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        })
      )
    );

    setCopyDialogOpen(false);
    setCopyTargetWeek(null);
    fetchSchedules();
  };

  const renderDay = (props: PickersDayProps) => {
    const isScheduled = scheduleList.some(s => s.date === props.day.format('YYYY-MM-DD'));
    return (
      <PickersDay
        {...props}
        sx={{
          backgroundColor: isScheduled ? '#1976d2' : undefined,
          color: isScheduled ? '#fff' : undefined,
          borderRadius: '50%',
          '&:hover': {
            backgroundColor: isScheduled ? '#1565c0' : undefined,
          },
        }}
      />
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={4}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">\ud83d\udccc My Shifts</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton onClick={() => handleMonthChange('prev')}>
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <Typography variant="body1" fontWeight="bold">
                  {format(currentMonth, 'MMMM')}
                </Typography>
                <IconButton onClick={() => handleMonthChange('next')}>
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            <ShiftList
              weeks={weeks}
              scheduleList={scheduleList}
              openEditDialog={openEditDialog}
              handleDelete={handleDelete}
              onCopyWeek={handleCopyWeek}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h5" mb={2}>\ud83d\uddd3 Select a Date to Add Schedule</Typography>
            <DateCalendar
              value={selectedDate}
              onChange={handleDateChange}
              slots={{ day: renderDay }}
            />
          </Grid>
        </Grid>

        <AddShiftDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          selectedDate={selectedDate}
          userId={userId}
          fetchSchedules={fetchSchedules}
          existingShifts={shiftsForSelectedDate}
        />

        <EditShiftDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          slot={editingSlot}
          fetchSchedules={fetchSchedules}
        />

        <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)}>
          <DialogTitle>Copy this week's schedule?</DialogTitle>
          <DialogContent>
            <Typography>
              This will copy all shifts from the selected week to the current week, skipping overlapping entries.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={confirmCopyWeek}>Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
